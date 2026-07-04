"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { openIssues, overallVerdict, SEVERITY_ORDER } from "@siteops/shared";
import type { Severity, Verdict } from "@siteops/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageResultCard, type PageResult } from "./PageResultCard";
import { RebaselineButton } from "./RebaselineButton";
import { SeverityChips } from "./SeverityChips";
import { ScanVerdictBanner } from "./VerdictBanner";

type ScanStatus = "queued" | "running" | "complete" | "failed";

interface Issue {
  id: string;
  pageId: string | null;
  severity: Severity;
  status: string;
}

interface ScanPayload {
  id: string;
  siteId: string;
  status: ScanStatus;
  userNote: string | null;
  pagesTotal: number;
  pagesDone: number;
  overallSeverity: Verdict | null;
  completedAt: string | null;
  results: PageResult[];
  issues: Issue[];
}

const POLL_MS = 2000;

export function ScanResults({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<ScanPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchScan = useCallback(async () => {
    const res = await fetch(`/api/scans/${scanId}`, { cache: "no-store" });
    if (!res.ok) {
      setLoadError("We couldn't load this scan. Try refreshing in a moment.");
      return null;
    }
    const payload = (await res.json()) as ScanPayload;
    setScan(payload);
    setLoadError(null);
    return payload;
  }, [scanId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      const payload = await fetchScan();
      if (cancelled) return;
      if (payload?.status === "queued" || payload?.status === "running") {
        timer = setTimeout(tick, POLL_MS);
      }
    }

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchScan]);

  const open = useMemo(() => openIssues(scan?.issues ?? []), [scan?.issues]);
  const verdict = useMemo(
    () => overallVerdict(open.map((issue) => issue.severity)),
    [open]
  );
  const counts = useMemo(() => {
    const next: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    for (const issue of open) next[issue.severity] += 1;
    return next;
  }, [open]);

  if (loadError && !scan) {
    return (
      <main className="flex flex-col gap-5">
        <h1 className="text-2xl font-semibold tracking-tight">Scan results</h1>
        <Card className="py-8 text-sm text-severity-critical">{loadError}</Card>
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  const running = scan.status === "queued" || scan.status === "running";
  const failed = scan.status === "failed";
  const progressLabel = failed
    ? "Scan failed"
    : running
      ? `Scanning... ${scan.pagesDone} of ${scan.pagesTotal} pages`
      : `Scan complete: ${scan.pagesDone} of ${scan.pagesTotal} pages checked`;

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scan results</h1>
          <p className="text-sm text-on-surface-secondary">{progressLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <RebaselineButton scanId={scan.id} disabled={running || failed} />
          <Button
            disabled
            title={running ? "Available after the scan completes" : "Coming next"}
            className="sm:self-start"
          >
            Generate report
          </Button>
        </div>
      </div>

      <ScanVerdictBanner
        status={scan.status}
        verdict={verdict}
        openIssueCount={open.length}
        pagesDone={scan.pagesDone}
        pagesTotal={scan.pagesTotal}
      />

      {running && (
        <Progress
          value={scan.pagesDone}
          max={scan.pagesTotal}
          label="Scan progress"
        />
      )}

      <SeverityChips counts={counts} order={SEVERITY_ORDER} />

      {scan.userNote && (
        <Card className="py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-muted">
            What changed
          </p>
          <p className="mt-1 text-sm text-on-surface-secondary">{scan.userNote}</p>
        </Card>
      )}

      {loadError && (
        <p role="status" className="text-sm text-severity-critical">
          {loadError}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {scan.results.map((result) => (
          <PageResultCard
            key={result.resultId ?? result.pageId}
            scanId={scan.id}
            result={result}
            issueCount={open.filter((issue) => issue.pageId === result.pageId).length}
          />
        ))}
        {running &&
          scan.results.length < scan.pagesTotal &&
          Array.from({ length: scan.pagesTotal - scan.results.length }).map((_, i) => (
            <Card key={i} className="flex h-64 flex-col gap-3">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
      </section>
    </main>
  );
}
