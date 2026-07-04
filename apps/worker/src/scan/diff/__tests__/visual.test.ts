import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { computeVisualDiff } from "../visual";

/** Solid white PNG with optional black rectangles painted on it. */
async function makePng(
  width: number,
  height: number,
  blocks: { x: number; y: number; w: number; h: number }[] = []
): Promise<Buffer> {
  const data = Buffer.alloc(width * height * 4, 255);
  for (const b of blocks) {
    for (let y = b.y; y < Math.min(height, b.y + b.h); y++) {
      for (let x = b.x; x < Math.min(width, b.x + b.w); x++) {
        const i = (y * width + x) * 4;
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
      }
    }
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

describe("computeVisualDiff (FR-010)", () => {
  it("identical images → ratio 0, valid overlay", async () => {
    const img = await makePng(100, 100);
    const result = await computeVisualDiff(img, img, "desktop");
    expect(result.ratio).toBe(0);
    expect(result.foldRatio).toBe(0);
    expect(result.heightDeltaPct).toBe(0);
    const meta = await sharp(result.diffPng).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
  });

  it("a known changed block lands in the expected ratio band", async () => {
    const before = await makePng(100, 100);
    // 30×30 black block = 9% of pixels → medium band (3–10%).
    const after = await makePng(100, 100, [{ x: 10, y: 10, w: 30, h: 30 }]);
    const { ratio } = await computeVisualDiff(before, after, "desktop");
    expect(ratio).toBeGreaterThan(0.08);
    expect(ratio).toBeLessThan(0.1);
  });

  it("an ignored region for the same viewport suppresses the diff", async () => {
    const before = await makePng(100, 100);
    const after = await makePng(100, 100, [{ x: 10, y: 10, w: 30, h: 30 }]);
    const { ratio } = await computeVisualDiff(before, after, "desktop", [
      { x: 5, y: 5, width: 40, height: 40, viewport: "desktop" },
    ]);
    expect(ratio).toBe(0);
  });

  it("an ignored region for the other viewport does not apply", async () => {
    const before = await makePng(100, 100);
    const after = await makePng(100, 100, [{ x: 10, y: 10, w: 30, h: 30 }]);
    const { ratio } = await computeVisualDiff(before, after, "desktop", [
      { x: 5, y: 5, width: 40, height: 40, viewport: "mobile" },
    ]);
    expect(ratio).toBeGreaterThan(0.08);
  });

  it("pads shorter image and reports the height delta", async () => {
    const before = await makePng(100, 100);
    const after = await makePng(100, 150);
    const result = await computeVisualDiff(before, after, "desktop");
    expect(result.heightDeltaPct).toBeCloseTo(50);
    expect(result.height).toBe(150);
    // Padded region is white in both → no diff from padding alone.
    expect(result.ratio).toBe(0);
  });

  it("fold ratio reflects only the above-the-fold strip", async () => {
    // Tall image: change sits entirely below the 900px desktop fold.
    const before = await makePng(100, 1800);
    const after = await makePng(100, 1800, [{ x: 0, y: 1000, w: 100, h: 400 }]);
    const result = await computeVisualDiff(before, after, "desktop");
    expect(result.ratio).toBeGreaterThan(0.2);
    expect(result.foldRatio).toBe(0);
  });
});
