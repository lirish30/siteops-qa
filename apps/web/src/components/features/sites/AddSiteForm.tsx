"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WpSignals = {
  wpContent: boolean;
  wpJson: boolean;
  generatorMeta: boolean;
};

type SiteResult = {
  id: string;
  url: string;
  name: string;
  wpDetection: "detected" | "not_detected" | "unknown";
  wpSignals: WpSignals;
};

const SIGNAL_LABELS: [keyof WpSignals, string][] = [
  ["wpContent", "WordPress theme/plugin files (/wp-content/)"],
  ["wpJson", "WordPress REST API (/wp-json/)"],
  ["generatorMeta", "WordPress generator tag"],
];

export function AddSiteForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [site, setSite] = useState<SiteResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    setChecking(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Something went wrong. Try again.");
      return;
    }
    setSite(body as SiteResult);
  }

  if (site) {
    const isWp = site.wpDetection === "detected";
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">{site.name}</h2>
          <p className="text-sm text-on-surface-secondary">{site.url}</p>
        </div>

        <ul className="flex flex-col gap-2" aria-label="WordPress detection results">
          {SIGNAL_LABELS.map(([key, label]) => (
            <li key={key} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={
                  site.wpSignals[key]
                    ? "text-severity-pass"
                    : "text-on-surface-muted"
                }
              >
                {site.wpSignals[key] ? "✓" : "—"}
              </span>
              <span className={site.wpSignals[key] ? "" : "text-on-surface-secondary"}>
                {label}
                <span className="sr-only">
                  {site.wpSignals[key] ? ": found" : ": not found"}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {!isWp && (
          <div
            role="status"
            className="rounded-lg bg-severity-medium-subtle p-3 text-sm text-severity-medium"
          >
            {site.wpDetection === "unknown"
              ? "We had trouble reading this site, so we couldn't confirm it runs WordPress. You can still continue."
              : "This doesn't look like a WordPress site. Everything still works — we'll monitor it the same way."}
          </div>
        )}

        <Button onClick={() => router.push(`/sites/${site.id}/pages`)}>
          Continue to pages
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Site URL"
        required
        type="text"
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        error={error ?? undefined}
        placeholder="e.g. clientsite.com"
        disabled={checking}
      />
      <Button type="submit" disabled={checking || !url.trim()}>
        {checking ? "Checking your site…" : "Check site"}
      </Button>
    </form>
  );
}
