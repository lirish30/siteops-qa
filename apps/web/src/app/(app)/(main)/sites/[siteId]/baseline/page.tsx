import Link from "next/link";
import { notFound } from "next/navigation";
import { thumbPathFor, SCREENSHOTS_BUCKET, type IgnoredRegion } from "@siteops/shared";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import {
  BaselinePageCard,
  type BaselinePageData,
} from "@/components/features/baseline/BaselinePageCard";

export const metadata = { title: "Baseline review — SiteOps QA" };

const SIGNED_URL_TTL_SECONDS = 600; // review page: enough to read, still short-lived

export default async function BaselineReviewPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id, name, url")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) notFound();

  const { data: baselines } = await supabase
    .from("baselines")
    .select(
      "id, page_id, status, http_status, page_title, meta_description, h1, canonical_url, console_errors, broken_links, forms, ctas, desktop_screenshot_path, mobile_screenshot_path, created_at, monitored_pages!inner ( id, url, label, is_active, ignored_regions )"
    )
    .eq("site_id", siteId)
    .eq("is_current", true)
    .eq("status", "complete")
    .eq("monitored_pages.is_active", true)
    .order("created_at");

  // Sign all screenshot URLs in one batch (bucket is private).
  const admin = createAdminClient();
  const paths = (baselines ?? []).flatMap((b) =>
    [b.desktop_screenshot_path, b.mobile_screenshot_path]
      .filter((p): p is string => Boolean(p))
      .flatMap((p) => [p, thumbPathFor(p)])
  );
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signedUrls } = await admin.storage
      .from(SCREENSHOTS_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    for (const entry of signedUrls ?? []) {
      if (entry.signedUrl && entry.path) signed.set(entry.path, entry.signedUrl);
    }
  }

  const sign = (path: string | null) => (path ? (signed.get(path) ?? null) : null);
  const pages: BaselinePageData[] = (baselines ?? []).map((b) => ({
    baselineId: b.id,
    pageId: b.page_id,
    label: b.monitored_pages.label,
    url: b.monitored_pages.url,
    capturedAt: b.created_at,
    httpStatus: b.http_status,
    title: b.page_title,
    metaDescription: b.meta_description,
    h1: b.h1,
    canonical: b.canonical_url,
    consoleErrorCount: Array.isArray(b.console_errors) ? b.console_errors.length : 0,
    brokenLinkCount: Array.isArray(b.broken_links) ? b.broken_links.length : 0,
    forms: (b.forms ?? []) as BaselinePageData["forms"],
    ctas: (b.ctas ?? []) as BaselinePageData["ctas"],
    ignoredRegions: (b.monitored_pages.ignored_regions ?? []) as IgnoredRegion[],
    screenshots: {
      desktop: {
        full: sign(b.desktop_screenshot_path),
        thumb: sign(b.desktop_screenshot_path ? thumbPathFor(b.desktop_screenshot_path) : null),
      },
      mobile: {
        full: sign(b.mobile_screenshot_path),
        thumb: sign(b.mobile_screenshot_path ? thumbPathFor(b.mobile_screenshot_path) : null),
      },
    },
  }));

  return (
    <main className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-on-surface-secondary">
          <Link href={`/sites/${site.id}`} className="text-primary hover:underline">
            {site.name}
          </Link>{" "}
          / Baseline
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Baseline review</h1>
        <p className="text-sm text-on-surface-secondary">
          This is the &quot;known good&quot; state every scan compares against.
          Draw ignore regions over anything that changes by design (carousels,
          dates, feeds).
        </p>
      </div>

      {pages.length === 0 ? (
        <Card className="py-10 text-center text-sm text-on-surface-secondary">
          No completed baseline yet.{" "}
          <Link href={`/sites/${site.id}`} className="text-primary hover:underline">
            Create one from the site overview.
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pages.map((page) => (
            <BaselinePageCard key={page.baselineId} page={page} />
          ))}
        </div>
      )}
    </main>
  );
}
