import sharp from "sharp";
import { SCREENSHOTS_BUCKET } from "@siteops/shared";
import { supabase } from "../lib/supabase";

export { SCREENSHOTS_BUCKET, thumbPathFor } from "@siteops/shared";

const THUMB_WIDTH = 480;
const THUMB_QUALITY = 70;

export interface StoredScreenshot {
  path: string; // full-size PNG
  thumbPath: string; // 480w WebP
  bytes: number;
}

export interface ScreenshotLocation {
  orgId: string;
  siteId: string;
  captureKind: "baseline" | "scan";
  captureId: string; // scan id
  pageId: string;
  viewport: "desktop" | "mobile";
}

function basePath(loc: ScreenshotLocation): string {
  return `${loc.orgId}/${loc.siteId}/${loc.captureKind}/${loc.captureId}/${loc.pageId}-${loc.viewport}`;
}

/**
 * Upload a full-size PNG + WebP thumbnail to the private screenshots bucket.
 * Throws on failure — callers write DB rows only after a successful upload
 * (PRD § 11: no orphaned rows pointing at missing files).
 */
export async function storeScreenshot(
  png: Buffer,
  loc: ScreenshotLocation
): Promise<StoredScreenshot> {
  const path = `${basePath(loc)}.png`;
  const thumbPath = `${basePath(loc)}-thumb.webp`;

  const thumb = await sharp(png)
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();

  const bucket = supabase.storage.from(SCREENSHOTS_BUCKET);
  const [full, small] = await Promise.all([
    bucket.upload(path, png, { contentType: "image/png", upsert: true }),
    bucket.upload(thumbPath, thumb, { contentType: "image/webp", upsert: true }),
  ]);
  if (full.error) throw new Error(`screenshot upload failed: ${full.error.message}`);
  if (small.error) throw new Error(`thumbnail upload failed: ${small.error.message}`);

  return { path, thumbPath, bytes: png.byteLength + thumb.byteLength };
}

/** Download a stored screenshot (baseline PNGs for diffing). Throws on failure. */
export async function downloadScreenshot(path: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(SCREENSHOTS_BUCKET).download(path);
  if (error || !data) throw new Error(`screenshot download failed for ${path}: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}
