"use client";

/* eslint-disable @next/next/no-img-element -- scan thumbnails are short-lived signed URLs */

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { BadgeSeverity } from "@/components/ui/badge";

export interface PageResult {
  resultId: string | null;
  pageId: string;
  label: string | null;
  url: string | null;
  status: string;
  errorMessage: string | null;
  severity: BadgeSeverity | null;
  diffRatios: { desktop: number | null; mobile: number | null } | null;
  thumbnails: { desktop: string | null; mobile: string | null };
}

export function PageResultCard({
  scanId,
  result,
  issueCount,
}: {
  scanId: string;
  result: PageResult;
  issueCount: number;
}) {
  const title = result.label || pathFromUrl(result.url) || "Page";
  const statusSeverity: BadgeSeverity =
    result.status === "failed" ? "high" : (result.severity ?? "pass");
  const hint = diffHint(result.diffRatios);

  const content = (
    <Card className="flex flex-col gap-3 p-0">
      <div className="relative h-40 overflow-hidden rounded-t-lg bg-surface-sunken">
        {result.thumbnails.desktop ? (
          <img
            src={result.thumbnails.desktop}
            alt={`Latest desktop screenshot for ${title}`}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <Skeleton className="h-full w-full rounded-none" />
        )}
        {result.thumbnails.mobile && (
          <img
            src={result.thumbnails.mobile}
            alt={`Latest mobile screenshot for ${title}`}
            className="absolute bottom-2 right-2 h-28 w-14 rounded-sm border border-border bg-surface object-cover object-top shadow-card"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            {result.url && (
              <p className="truncate font-mono text-xs text-on-surface-muted">
                {pathFromUrl(result.url)}
              </p>
            )}
          </div>
          <SeverityBadge severity={statusSeverity} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 text-xs text-on-surface-secondary">
          <span>{statusLabel(result.status, issueCount)}</span>
          {hint && <span className="font-medium">{hint}</span>}
        </div>

        {result.status === "failed" && result.errorMessage && (
          <p className="rounded-md bg-severity-critical-subtle p-2 text-xs text-severity-critical">
            {result.errorMessage}
          </p>
        )}
      </div>
    </Card>
  );

  if (!result.resultId) return content;
  return (
    <Link
      href={`/scans/${scanId}/pages/${result.pageId}`}
      className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {content}
    </Link>
  );
}

function pathFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function statusLabel(status: string, issueCount: number): string {
  if (status === "complete") {
    return issueCount === 0
      ? "No open findings"
      : `${issueCount} open finding${issueCount === 1 ? "" : "s"}`;
  }
  if (status === "failed") return "Page failed";
  return "Scanning...";
}

function diffHint(
  ratios: { desktop: number | null; mobile: number | null } | null
): string | null {
  if (!ratios) return null;
  const values = [ratios.desktop, ratios.mobile].filter(
    (value): value is number => typeof value === "number"
  );
  if (values.length === 0) return null;
  const max = Math.max(...values);
  return `${(max * 100).toFixed(max < 0.01 ? 2 : 1)}% visual diff`;
}
