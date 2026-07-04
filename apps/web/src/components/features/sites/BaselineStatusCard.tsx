"use client";

/* eslint-disable @next/next/no-img-element -- signed URLs are short-lived; next/image caching hurts here */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface PageResult {
  pageId: string;
  label: string | null;
  url: string | null;
  status: string;
  errorMessage: string | null;
  thumbnails: { desktop: string | null; mobile: string | null };
}

interface ScanPayload {
  id: string;
  status: "queued" | "running" | "complete" | "failed";
  pagesTotal: number;
  pagesDone: number;
  results: PageResult[];
}

const POLL_MS = 2000;

/**
 * Baseline creation + live progress (US-003). Starts a run, polls
 * GET /api/scans/:id every 2s, fills thumbnails in as pages complete,
 * and offers per-page retry on failures.
 */
export function BaselineStatusCard({
  siteId,
  initialScanId,
  hasBaseline,
}: {
  siteId: string;
  initialScanId: string | null;
  hasBaseline: boolean;
}) {
  const router = useRouter();
  const [scanId, setScanId] = useState<string | null>(initialScanId);
  const [scan, setScan] = useState<ScanPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refreshedRef = useRef(false);

  const poll = useCallback(async (id: string): Promise<ScanPayload | null> => {
    const res = await fetch(`/api/scans/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ScanPayload;
  }, []);

  useEffect(() => {
    if (!scanId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      const payload = await poll(scanId!);
      if (cancelled) return;
      if (payload) {
        setScan(payload);
        if (payload.status === "complete" && !refreshedRef.current) {
          // Re-render the server page: enables Run scan, shows review link.
          refreshedRef.current = true;
          router.refresh();
        }
        if (payload.status === "queued" || payload.status === "running") {
          timer = setTimeout(tick, POLL_MS);
        }
      } else {
        timer = setTimeout(tick, POLL_MS * 2);
      }
    }
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scanId, poll, router]);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/sites/${siteId}/baseline`, { method: "POST" });
    setBusy(false);
    if (res.status === 202) {
      const body = (await res.json()) as { scanId: string };
      refreshedRef.current = false;
      setScan(null);
      setScanId(body.scanId);
      return;
    }
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    setError(body?.error ?? "We couldn't start the baseline. Try again.");
  }

  async function handleRetryPage(pageId: string) {
    if (!scanId) return;
    await fetch(`/api/scans/${scanId}/retry-page`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageId }),
    });
    // The poll loop picks up the real state; nudge locally for feedback and
    // restart polling (a failed scan stops the loop).
    setScan((prev) =>
      prev
        ? {
            ...prev,
            status: "running",
            results: prev.results.map((r) =>
              r.pageId === pageId ? { ...r, status: "pending" } : r
            ),
          }
        : prev
    );
    refreshedRef.current = false;
    const id = scanId;
    setScanId(null);
    setTimeout(() => setScanId(id), 0);
  }

  // ── Idle: no run yet ───────────────────────────────────────────────────────
  if (!scanId) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-[15px] font-semibold">
          {hasBaseline ? "Refresh your baseline" : "No baseline yet"}
        </p>
        <p className="max-w-sm text-sm text-on-surface-secondary">
          A baseline is the &quot;known good&quot; snapshot of your pages. Every
          future scan compares against it, so you can prove what changed.
        </p>
        <Button onClick={handleCreate} disabled={busy}>
          {busy ? "Starting…" : "Create baseline"}
        </Button>
        {error && (
          <p role="status" className="text-xs text-severity-critical">
            {error}
          </p>
        )}
      </Card>
    );
  }

  const running = !scan || scan.status === "queued" || scan.status === "running";
  const failedPages = scan?.results.filter((r) => r.status === "failed") ?? [];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold" role="status">
            {running
              ? `Creating baseline… ${scan?.pagesDone ?? 0} of ${scan?.pagesTotal ?? "…"} pages`
              : scan?.status === "complete"
                ? "Baseline complete"
                : "Baseline failed"}
          </p>
          {!running && failedPages.length > 0 && (
            <p className="text-xs text-on-surface-secondary">
              {failedPages.length} page{failedPages.length === 1 ? "" : "s"} failed —
              retry below.
            </p>
          )}
        </div>
        {!running && scan?.status === "failed" && (
          <Button onClick={handleCreate} disabled={busy} variant="secondary">
            Retry baseline
          </Button>
        )}
      </div>

      {scan && scan.pagesTotal > 0 && (
        <Progress
          value={scan.pagesDone}
          max={scan.pagesTotal}
          label="Baseline progress"
        />
      )}

      <ul className="flex flex-col divide-y divide-border">
        {(scan?.results ?? []).map((r) => (
          <li key={r.pageId} className="flex items-center gap-3 py-2">
            {r.thumbnails.desktop ? (
              <img
                src={r.thumbnails.desktop}
                alt={`Baseline screenshot of ${r.label || r.url || "page"}, desktop`}
                className="h-12 w-20 rounded-sm border border-border object-cover object-top"
              />
            ) : (
              <Skeleton className="h-12 w-20 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {r.label || (r.url ? new URL(r.url).pathname : "Page")}
              </p>
              {r.status === "failed" && r.errorMessage && (
                <p className="truncate text-xs text-severity-critical">
                  {r.errorMessage}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs">
              {r.status === "complete" && (
                <span className="text-severity-pass">✓ Captured</span>
              )}
              {r.status === "failed" && (
                <button
                  onClick={() => handleRetryPage(r.pageId)}
                  className="font-medium text-primary hover:underline"
                >
                  Retry
                </button>
              )}
              {r.status !== "complete" && r.status !== "failed" && (
                <span className="text-on-surface-secondary">Capturing…</span>
              )}
            </span>
          </li>
        ))}
        {running && !scan?.results.length && (
          <li className="py-2">
            <Skeleton className="h-12 w-full" />
          </li>
        )}
      </ul>
    </Card>
  );
}
