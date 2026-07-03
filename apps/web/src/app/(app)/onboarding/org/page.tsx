"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CreateOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok || res.status === 409) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => ({}));
    setError(body.error ?? "Something went wrong. Try again.");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <p className="text-lg font-semibold tracking-tight">
        SiteOps <span className="text-primary">QA</span>
      </p>
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Name your workspace</h1>
            <p className="mt-1 text-sm text-on-surface-secondary">
              Usually your agency or company name. You can change it later.
            </p>
          </div>
          <Input
            label="Organization name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error ?? undefined}
            placeholder="e.g. Northlight Digital"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Setting up…" : "Continue"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
