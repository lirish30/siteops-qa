"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/**
 * Run-scan trigger (US-004): button → modal with a "what changed?" note →
 * POST /api/sites/:id/scans → route to the live scan page. 409/412/402 are
 * surfaced in brand voice; 412 links to baseline creation.
 */
export function RunScanButton({
  siteId,
  disabled,
  disabledReason,
  variant = "primary",
}: {
  siteId: string;
  disabled?: boolean;
  disabledReason?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsBaseline, setNeedsBaseline] = useState(false);

  async function handleRun() {
    setBusy(true);
    setError(null);
    setNeedsBaseline(false);
    const res = await fetch(`/api/sites/${siteId}/scans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: note.trim() || undefined }),
    });
    if (res.status === 202) {
      const body = (await res.json()) as { scanId: string };
      router.push(`/scans/${body.scanId}`);
      return;
    }
    setBusy(false);
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (res.status === 412) setNeedsBaseline(true);
    setError(body?.error ?? "We couldn't start the scan. Try again.");
  }

  return (
    <>
      <Button
        variant={variant}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        onClick={() => setOpen(true)}
      >
        Run scan
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Run a scan">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-on-surface-secondary">
            We&apos;ll re-capture every monitored page and compare it against
            your baseline.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              What changed?{" "}
              <span className="font-normal text-on-surface-secondary">
                (optional)
              </span>
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="e.g. 'Updated 6 plugins'"
              className="h-10 rounded-md border border-border-strong bg-surface px-3 text-sm outline-none placeholder:text-on-surface-muted focus:border-primary"
            />
            <span className="text-xs text-on-surface-muted">
              This note lands on the results and the client report.
            </span>
          </label>
          {error && (
            <p role="status" className="text-sm text-severity-critical">
              {error}{" "}
              {needsBaseline && (
                <Link
                  href={`/sites/${siteId}`}
                  onClick={() => setOpen(false)}
                  className="font-medium underline"
                >
                  Create a baseline
                </Link>
              )}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRun} disabled={busy}>
              {busy ? "Starting…" : "Start scan"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
