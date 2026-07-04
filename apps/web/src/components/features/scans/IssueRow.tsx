"use client";

import { useMemo, useState } from "react";
import type { Json } from "@siteops/shared/database.types";
import type { Severity } from "@siteops/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/badge";

export interface IssueRowData {
  id: string;
  type: string;
  severity: Severity;
  needsReview: boolean;
  title: string;
  description: string;
  evidence: Json;
  recommendation: string | null;
  status: string;
  humanNotes: string | null;
}

type IssueStatus = "expected" | "resolved" | "dismissed";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  expected: "Expected",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export function IssueRow({ issue }: { issue: IssueRowData }) {
  const [current, setCurrent] = useState(issue);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(issue.humanNotes ?? "");
  const [busy, setBusy] = useState<IssueStatus | "notes" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const snippet = useMemo(() => evidenceSnippet(current.evidence), [current.evidence]);

  async function patchIssue(body: { status?: IssueStatus; humanNotes?: string | null }) {
    const res = await fetch(`/api/issues/${current.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "We couldn't update that issue.");
    }
    const updated = (await res.json()) as {
      status: string;
      humanNotes: string | null;
    };
    setCurrent((prev) => ({
      ...prev,
      status: updated.status,
      humanNotes: updated.humanNotes,
    }));
    setNotes(updated.humanNotes ?? "");
  }

  async function setStatus(status: IssueStatus) {
    setBusy(status);
    setError(null);
    try {
      await patchIssue({ status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't update that issue.");
    } finally {
      setBusy(null);
    }
  }

  async function saveNotes() {
    if (notes.trim() === (current.humanNotes ?? "")) return;
    setBusy("notes");
    setError(null);
    try {
      await patchIssue({ humanNotes: notes.trim() || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save those notes.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <button
          onClick={() => setExpanded((value) => !value)}
          className="min-w-0 text-left"
          aria-expanded={expanded}
        >
          <p className="text-sm font-semibold">{current.title}</p>
          <p className="mt-0.5 text-sm text-on-surface-secondary">
            {current.description}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <SeverityBadge severity={current.severity} />
          <span className="rounded-full bg-surface-sunken px-2 py-1 text-xs font-medium text-on-surface-secondary">
            {STATUS_LABELS[current.status] ?? current.status}
          </span>
        </div>
      </div>

      <p className="text-xs text-on-surface-secondary">{snippet}</p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => setStatus("expected")}
          disabled={busy !== null || current.status === "expected"}
          className="h-8 px-3 text-xs"
        >
          {busy === "expected" ? "Saving..." : "Expected"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setStatus("resolved")}
          disabled={busy !== null || current.status === "resolved"}
          className="h-8 px-3 text-xs"
        >
          {busy === "resolved" ? "Saving..." : "Resolved"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setStatus("dismissed")}
          disabled={busy !== null || current.status === "dismissed"}
          className="h-8 px-3 text-xs"
        >
          {busy === "dismissed" ? "Saving..." : "Dismiss"}
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          {current.recommendation && (
            <p className="text-xs font-medium text-on-surface-secondary">
              Recommendation: {current.recommendation}
            </p>
          )}
          <pre className="max-h-56 overflow-auto rounded-md bg-surface-sunken p-3 text-xs text-on-surface-secondary">
            {JSON.stringify(current.evidence, null, 2)}
          </pre>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-on-surface-secondary">
              Team notes
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={saveNotes}
              rows={3}
              maxLength={2000}
              placeholder="Add context for this finding..."
              className="rounded-md border border-border-strong bg-surface p-3 text-sm outline-none placeholder:text-on-surface-muted focus:border-primary"
            />
            {busy === "notes" && (
              <span className="text-xs text-on-surface-muted">Saving notes...</span>
            )}
          </label>
        </div>
      )}

      {error && (
        <p role="status" className="text-xs text-severity-critical">
          {error}
        </p>
      )}
    </Card>
  );
}

function evidenceSnippet(evidence: Json): string {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return "Evidence is attached to this finding.";
  }
  const value = evidence as Record<string, unknown>;
  if ("before" in value || "after" in value) {
    return `Before: ${shortValue(value.before)}. After: ${shortValue(value.after)}.`;
  }
  if ("errors" in value) return `${asArray(value.errors).length} new browser error(s) recorded.`;
  if ("link" in value) return `Link: ${shortValue(value.link)}.`;
  if ("images" in value) return `${asArray(value.images).length} image(s) failed to load.`;
  if ("ratio" in value) return `Visual difference: ${formatRatio(value.ratio)}.`;
  if ("error" in value) return `Error: ${shortValue(value.error)}.`;
  return "Evidence is attached to this finding.";
}

function shortValue(value: unknown): string {
  if (value === null || value === undefined) return "none";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function formatRatio(value: unknown): string {
  return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "recorded";
}
