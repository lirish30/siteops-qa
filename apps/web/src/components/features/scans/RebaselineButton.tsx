"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function RebaselineButton({
  scanId,
  disabled,
}: {
  scanId: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/scans/${scanId}/rebaseline`, { method: "POST" });
    setBusy(false);
    if (res.status === 202) {
      setMessage("Future scans will compare against this scan's state.");
      return;
    }
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    setError(payload?.error ?? "We couldn't update the baseline. Try again.");
  }

  return (
    <>
      <Button
        variant="secondary"
        disabled={disabled}
        title={disabled ? "Available after the scan completes" : undefined}
        onClick={() => setOpen(true)}
      >
        Set as baseline
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Set as new baseline?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-on-surface-secondary">
            Future scans will compare against this scan&apos;s state. Successful
            pages become the new baseline; failed pages keep their existing baseline.
          </p>
          {message && <p className="text-sm text-severity-pass">{message}</p>}
          {error && <p className="text-sm text-severity-critical">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={confirm} disabled={busy || Boolean(message)}>
              {busy ? "Updating..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
