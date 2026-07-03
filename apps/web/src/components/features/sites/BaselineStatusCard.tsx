"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Pre-baseline state only for now — the endpoint and live progress land in
// Phase 2 (TASK-029–031). The button POSTs and surfaces the 501/404 politely.
export function BaselineStatusCard({ siteId }: { siteId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/sites/${siteId}/baseline`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok || res.status === 202) {
      setMessage("Baseline requested — progress tracking arrives with the scan engine.");
      return;
    }
    setMessage(
      "Baselines aren't wired up yet — the scan engine lands in the next phase."
    );
  }

  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-[15px] font-semibold">No baseline yet</p>
      <p className="max-w-sm text-sm text-on-surface-secondary">
        A baseline is the &quot;known good&quot; snapshot of your pages. Every
        future scan compares against it, so you can prove what changed.
      </p>
      <Button onClick={handleCreate} disabled={busy}>
        {busy ? "Requesting…" : "Create baseline"}
      </Button>
      {message && (
        <p role="status" className="text-xs text-on-surface-secondary">
          {message}
        </p>
      )}
    </Card>
  );
}
