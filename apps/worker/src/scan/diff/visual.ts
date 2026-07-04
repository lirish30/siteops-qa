import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";
// Type-only: storage.ts builds a Supabase client at import time, which the
// pure-diff unit tests must not require. Loaded lazily in runVisualDiff.
import type { ScreenshotLocation } from "../storage";
import type { Viewport } from "../capture";

// FR-010 pixelmatch settings — change only here, with tests updated.
const PIXELMATCH_THRESHOLD = 0.1;
const OVERLAY_ALPHA = 0.2; // diff overlay: red on 20%-opacity original

// Above-the-fold strip heights per viewport (PRD FR-010: top 900px desktop /
// 844px mobile — one mobile viewport height).
export const FOLD_HEIGHT_PX: Record<Viewport, number> = {
  desktop: 900,
  mobile: 844,
};

const PAD_BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 };

export interface IgnoredRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  viewport: Viewport;
}

export interface VisualDiffComputation {
  /** Changed pixels / total pixels, 0..1, after padding + ignored regions. */
  ratio: number;
  /** Same ratio computed on the above-the-fold strip only. */
  foldRatio: number;
  /** abs(height delta) as % of baseline height (layout-shift signal, § 11). */
  heightDeltaPct: number;
  /** Red-on-faded-original diff overlay, PNG encoded. */
  diffPng: Buffer;
  width: number;
  height: number;
}

interface RawImage {
  data: Buffer;
  width: number;
  height: number;
}

/** Decode a PNG and pad it (white) to the target dimensions, as raw RGBA. */
async function toPaddedRaw(png: Buffer, targetWidth: number, targetHeight: number): Promise<RawImage> {
  const meta = await sharp(png).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const data = await sharp(png)
    .extend({
      right: Math.max(0, targetWidth - width),
      bottom: Math.max(0, targetHeight - height),
      background: PAD_BACKGROUND,
    })
    .ensureAlpha()
    .raw()
    .toBuffer();
  return { data, width: targetWidth, height: targetHeight };
}

/** Paint a region identically in both buffers so it never counts as a diff. */
function zeroOutRegion(a: RawImage, b: RawImage, region: IgnoredRegion): void {
  const x0 = Math.max(0, Math.floor(region.x));
  const y0 = Math.max(0, Math.floor(region.y));
  const x1 = Math.min(a.width, Math.ceil(region.x + region.width));
  const y1 = Math.min(a.height, Math.ceil(region.y + region.height));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * a.width + x) * 4;
      // Opaque mid-gray in both images — identical pixels, zero diff.
      a.data[i] = b.data[i] = 128;
      a.data[i + 1] = b.data[i + 1] = 128;
      a.data[i + 2] = b.data[i + 2] = 128;
      a.data[i + 3] = b.data[i + 3] = 255;
    }
  }
}

/**
 * Pure visual comparison per FR-010: pad to equal dimensions, zero out
 * ignored regions for the matching viewport, pixelmatch (threshold 0.1,
 * includeAA false), diff ratio + above-the-fold ratio, red overlay PNG.
 */
export async function computeVisualDiff(
  baselinePng: Buffer,
  currentPng: Buffer,
  viewport: Viewport,
  ignoredRegions: IgnoredRegion[] = []
): Promise<VisualDiffComputation> {
  const [baseMeta, currMeta] = await Promise.all([
    sharp(baselinePng).metadata(),
    sharp(currentPng).metadata(),
  ]);
  const baseHeight = baseMeta.height ?? 0;
  const width = Math.max(baseMeta.width ?? 0, currMeta.width ?? 0);
  const height = Math.max(baseHeight, currMeta.height ?? 0);
  if (width === 0 || height === 0) throw new Error("visual diff: empty image");

  const heightDeltaPct =
    baseHeight > 0 ? (Math.abs(baseHeight - (currMeta.height ?? 0)) / baseHeight) * 100 : 0;

  const [baseline, current] = await Promise.all([
    toPaddedRaw(baselinePng, width, height),
    toPaddedRaw(currentPng, width, height),
  ]);

  for (const region of ignoredRegions) {
    if (region.viewport === viewport) zeroOutRegion(baseline, current, region);
  }

  const diff = new PNG({ width, height });
  const changed = pixelmatch(baseline.data, current.data, diff.data, width, height, {
    threshold: PIXELMATCH_THRESHOLD,
    includeAA: false,
    alpha: OVERLAY_ALPHA,
  });
  const ratio = changed / (width * height);

  // Above-the-fold strip: rows are contiguous in raw RGBA, so slicing is cheap.
  const foldHeight = Math.min(FOLD_HEIGHT_PX[viewport], height);
  const foldBytes = foldHeight * width * 4;
  const foldChanged = pixelmatch(
    baseline.data.subarray(0, foldBytes),
    current.data.subarray(0, foldBytes),
    undefined,
    width,
    foldHeight,
    { threshold: PIXELMATCH_THRESHOLD, includeAA: false }
  );
  const foldRatio = foldChanged / (width * foldHeight);

  return {
    ratio,
    foldRatio,
    heightDeltaPct,
    diffPng: PNG.sync.write(diff),
    width,
    height,
  };
}

export interface VisualDiffResult {
  ratio: number;
  foldRatio: number;
  heightDeltaPct: number;
  /** Storage path of the uploaded diff overlay PNG. */
  diffPath: string;
}

/**
 * Full FR-010 step for one page+viewport during a scan: compute the diff and
 * upload the overlay (PNG + WebP thumb) via storage.ts. The overlay is stored
 * next to the scan's screenshots with a `-diff` suffix on the pageId key.
 */
export async function runVisualDiff(
  baselinePng: Buffer,
  currentPng: Buffer,
  loc: ScreenshotLocation,
  ignoredRegions: IgnoredRegion[] = []
): Promise<VisualDiffResult> {
  const computed = await computeVisualDiff(baselinePng, currentPng, loc.viewport, ignoredRegions);
  const { storeScreenshot } = await import("../storage");
  const stored = await storeScreenshot(computed.diffPng, {
    ...loc,
    pageId: `${loc.pageId}-diff`,
  });
  return {
    ratio: computed.ratio,
    foldRatio: computed.foldRatio,
    heightDeltaPct: computed.heightDeltaPct,
    diffPath: stored.path,
  };
}
