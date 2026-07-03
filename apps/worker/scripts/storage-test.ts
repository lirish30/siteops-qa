// Scratch verification for the storage pipeline (TASK-028): uploads a real capture, signs a URL, fetches it, then deletes the test files.
import { runPageCapture } from "../src/scan/run-page-capture";
import { closeBrowser } from "../src/scan/browser";
import { supabase } from "../src/lib/supabase";
import { thumbPathFor } from "@siteops/shared";

const out = await runPageCapture({
  orgId: "00000000-0000-0000-0000-000000000000",
  siteId: "11111111-1111-1111-1111-111111111111",
  captureKind: "baseline",
  captureId: "22222222-2222-2222-2222-222222222222",
  pageId: "33333333-3333-3333-3333-333333333333",
  url: "https://wordpress.org",
});
console.log("capture ok:", {
  status: out.httpStatus,
  desktop: out.desktopScreenshotPath,
  bytes: out.screenshotBytes,
  durationMs: out.durationMs,
});
const { data, error } = await supabase.storage
  .from("screenshots")
  .createSignedUrl(thumbPathFor(out.desktopScreenshotPath), 60);
console.log("signed url ok:", Boolean(data?.signedUrl), error ?? "");
const res = await fetch(data!.signedUrl);
console.log("signed url fetch:", res.status, res.headers.get("content-type"));
// cleanup test files
const base = "00000000-0000-0000-0000-000000000000";
const { data: listed } = await supabase.storage.from("screenshots").list(`${base}/11111111-1111-1111-1111-111111111111/baseline/22222222-2222-2222-2222-222222222222`);
const paths = (listed ?? []).map((f) => `${base}/11111111-1111-1111-1111-111111111111/baseline/22222222-2222-2222-2222-222222222222/${f.name}`);
await supabase.storage.from("screenshots").remove(paths);
console.log("cleaned", paths.length, "files");
await closeBrowser();
