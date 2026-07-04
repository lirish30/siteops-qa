"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, SeverityBadge, type BadgeSeverity } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoryItem {
  id: string;
  status: string;
  note: string | null;
  pagesTotal: number;
  pagesDone: number;
  overallSeverity: BadgeSeverity | null;
  completedAt: string | null;
  createdAt: string;
  issueCounts: Record<string, number>;
}

interface HistoryPayload {
  scans: HistoryItem[];
  nextCursor: string | null;
}

export function ScanHistoryList({ siteId }: { siteId: string }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      setLoading(true);
      const payload = await fetchHistory(siteId, null);
      if (cancelled) return;
      if (payload) {
        setItems(payload.scans);
        setNextCursor(payload.nextCursor);
        setError(null);
      } else {
        setError("We couldn't load scan history.");
      }
      setLoading(false);
    }
    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    const payload = await fetchHistory(siteId, nextCursor);
    setLoadingMore(false);
    if (!payload) {
      setError("We couldn't load more scans.");
      return;
    }
    setItems((prev) => [...prev, ...payload.scans]);
    setNextCursor(payload.nextCursor);
    setError(null);
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-on-surface-secondary">
          Scan history
        </h2>
      </div>

      {loading ? (
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : items.length === 0 ? (
        <Card className="py-8 text-center text-sm text-on-surface-secondary">
          No scans yet. Run one after your next update and we&apos;ll compare it
          to your baseline.
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {items.map((scan) => (
              <li key={scan.id}>
                <Link
                  href={`/scans/${scan.id}`}
                  className="flex flex-col gap-2 p-3 hover:bg-surface-sunken sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{scanTitle(scan)}</p>
                    <p className="truncate text-xs text-on-surface-secondary">
                      {scan.note || `${scan.pagesDone} of ${scan.pagesTotal} pages checked`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <SeverityBadge severity={severityFor(scan)} label={verdictLabel(scan)} />
                    {countChips(scan.issueCounts).map((chip) => (
                      <Chip key={chip}>{chip}</Chip>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {nextCursor && (
            <div className="border-t border-border p-3 text-center">
              <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {error && (
        <p role="status" className="text-xs text-severity-critical">
          {error}
        </p>
      )}
    </section>
  );
}

async function fetchHistory(siteId: string, cursor: string | null) {
  const url = new URL(`/api/sites/${siteId}/scans`, window.location.origin);
  if (cursor) url.searchParams.set("cursor", cursor);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as HistoryPayload;
}

function scanTitle(scan: HistoryItem): string {
  const date = new Date(scan.completedAt ?? scan.createdAt);
  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} at ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function severityFor(scan: HistoryItem): BadgeSeverity {
  if (scan.status === "failed") return "high";
  return scan.overallSeverity ?? "pass";
}

function verdictLabel(scan: HistoryItem): string {
  if (scan.status === "failed") return "Failed";
  if (!scan.overallSeverity || scan.overallSeverity === "pass") return "Pass";
  return scan.overallSeverity[0].toUpperCase() + scan.overallSeverity.slice(1);
}

function countChips(counts: Record<string, number>): string[] {
  return ["critical", "high", "medium", "low", "info"]
    .map((severity) => ({ severity, count: counts[severity] ?? 0 }))
    .filter((item) => item.count > 0)
    .map((item) => `${item.count} ${item.severity}`);
}
