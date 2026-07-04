import Link from "next/link";
import { notFound } from "next/navigation";
import { SCREENSHOTS_BUCKET } from "@siteops/shared";
import type { Severity } from "@siteops/shared";
import type { Json } from "@siteops/shared/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/badge";
import { ImageCompare } from "@/components/features/scans/ImageCompare";
import { IssueRow, type IssueRowData } from "@/components/features/scans/IssueRow";
import { TechnicalPanel, type TechnicalSnapshot } from "@/components/features/scans/TechnicalPanel";

export const metadata = { title: "Page scan result — SiteOps QA" };

const SIGNED_URL_TTL_SECONDS = 600;

type PageParams = { params: Promise<{ scanId: string; pageId: string }> };

export default async function PageScanResultPage({ params }: PageParams) {
  const { scanId, pageId } = await params;
  const supabase = await createClient();

  const { data: result } = await supabase
    .from("page_scan_results")
    .select(
      "id, status, error_message, severity, http_status, desktop_screenshot_path, mobile_screenshot_path, desktop_diff_path, mobile_diff_path, desktop_diff_ratio, mobile_diff_ratio, metadata_snapshot, console_errors, broken_links, forms, ctas, monitored_pages!inner ( id, label, url ), scans!inner ( id, site_id, sites!inner ( id, name ) ), baselines ( id, http_status, page_title, meta_description, h1, canonical_url, console_errors, broken_links, forms, ctas, desktop_screenshot_path, mobile_screenshot_path )"
    )
    .eq("scan_id", scanId)
    .eq("page_id", pageId)
    .maybeSingle();

  if (!result) notFound();

  const { data: issues } = await supabase
    .from("issues")
    .select(
      "id, type, severity, needs_review, title, description, evidence, recommendation, status, human_notes"
    )
    .eq("scan_id", scanId)
    .eq("page_id", pageId)
    .order("created_at");

  const signed = await signPaths([
    result.baselines?.desktop_screenshot_path,
    result.baselines?.mobile_screenshot_path,
    result.desktop_screenshot_path,
    result.mobile_screenshot_path,
    result.desktop_diff_path,
    result.mobile_diff_path,
  ]);
  const sign = (path: string | null | undefined) => (path ? (signed.get(path) ?? null) : null);

  const pageTitle =
    result.monitored_pages.label || pathFromUrl(result.monitored_pages.url) || "Page";
  const baseline = result.baselines;
  const snapshot = normalizeMetadataSnapshot(result.metadata_snapshot);

  const technical: TechnicalSnapshot = {
    baseline: {
      httpStatus: baseline?.http_status ?? null,
      title: baseline?.page_title ?? null,
      metaDescription: baseline?.meta_description ?? null,
      h1: baseline?.h1 ?? null,
      canonical: baseline?.canonical_url ?? null,
      consoleErrors: asArray(baseline?.console_errors),
      brokenLinks: asArray(baseline?.broken_links),
      forms: asArray(baseline?.forms),
      ctas: asArray(baseline?.ctas),
    },
    current: {
      httpStatus: result.http_status,
      title: snapshot.pageTitle,
      metaDescription: snapshot.metaDescription,
      h1: snapshot.h1,
      canonical: snapshot.canonicalUrl,
      consoleErrors: asArray(result.console_errors),
      brokenLinks: asArray(result.broken_links),
      forms: asArray(result.forms),
      ctas: asArray(result.ctas),
    },
    infoNotes: snapshot.infoNotes,
  };

  return (
    <main className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-on-surface-secondary">
          <Link href={`/scans/${scanId}`} className="text-primary hover:underline">
            Scan results
          </Link>{" "}
          / {pageTitle}
        </p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {pageTitle}
            </h1>
            <p className="truncate font-mono text-xs text-on-surface-secondary">
              {result.monitored_pages.url}
            </p>
          </div>
          <SeverityBadge
            severity={
              result.status === "failed"
                ? "high"
                : ((result.severity as Severity | null) ?? "pass")
            }
          />
        </div>
      </div>

      {result.status === "failed" && (
        <Card className="bg-severity-critical-subtle text-severity-critical">
          <p className="text-sm font-semibold">This page failed to scan.</p>
          {result.error_message && <p className="mt-1 text-sm">{result.error_message}</p>}
        </Card>
      )}

      <ImageCompare
        images={{
          desktop: {
            baseline: sign(baseline?.desktop_screenshot_path),
            current: sign(result.desktop_screenshot_path),
            diff: sign(result.desktop_diff_path),
            diffRatio: result.desktop_diff_ratio,
          },
          mobile: {
            baseline: sign(baseline?.mobile_screenshot_path),
            current: sign(result.mobile_screenshot_path),
            diff: sign(result.mobile_diff_path),
            diffRatio: result.mobile_diff_ratio,
          },
        }}
        pageLabel={pageTitle}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-on-surface-secondary">Issues</h2>
        {(issues ?? []).length === 0 ? (
          <Card className="py-6 text-sm text-on-surface-secondary">
            No page-specific issues were created for this result.
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {((issues ?? []) as RawIssueRow[]).map((issue) => (
              <IssueRow key={issue.id} issue={toIssueRow(issue)} />
            ))}
          </div>
        )}
      </section>

      <TechnicalPanel snapshot={technical} />
    </main>
  );
}

async function signPaths(paths: Array<string | null | undefined>) {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const signed = new Map<string, string>();
  if (unique.length === 0) return signed;

  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(SCREENSHOTS_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
  }
  return signed;
}

interface RawIssueRow {
  id: string;
  type: string;
  severity: string;
  needs_review: boolean;
  title: string;
  description: string;
  evidence: Json;
  recommendation: string | null;
  status: string;
  human_notes: string | null;
}

function toIssueRow(issue: RawIssueRow): IssueRowData {
  return {
    id: issue.id,
    type: issue.type,
    severity: issue.severity as Severity,
    needsReview: issue.needs_review,
    title: issue.title,
    description: issue.description,
    evidence: issue.evidence,
    recommendation: issue.recommendation,
    status: issue.status,
    humanNotes: issue.human_notes,
  };
}

function pathFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function normalizeMetadataSnapshot(value: Json): {
  pageTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonicalUrl: string | null;
  infoNotes: string[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      pageTitle: null,
      metaDescription: null,
      h1: null,
      canonicalUrl: null,
      infoNotes: [],
    };
  }
  const record = value as Record<string, unknown>;
  return {
    pageTitle: asNullableString(record.pageTitle),
    metaDescription: asNullableString(record.metaDescription),
    h1: asNullableString(record.h1),
    canonicalUrl: asNullableString(record.canonicalUrl),
    infoNotes: Array.isArray(record.infoNotes)
      ? record.infoNotes.filter((note): note is string => typeof note === "string")
      : [],
  };
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
