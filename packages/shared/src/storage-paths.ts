// Screenshot storage path conventions (Phase 2, TASK-028). The worker writes
// `{base}.png` + `{base}-thumb.webp`; web signs URLs for both.

export const SCREENSHOTS_BUCKET = "screenshots";

/** Storage path of the WebP thumbnail written next to a full-size PNG. */
export function thumbPathFor(screenshotPath: string): string {
  return screenshotPath.replace(/\.png$/, "-thumb.webp");
}
