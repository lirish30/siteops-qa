"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { InfoBanner } from "@/components/ui/banner";
import { PageRow, type SelectablePage } from "./PageRow";
import { ManualUrlInput } from "./ManualUrlInput";
import { PlanLimitSidebar } from "./PlanLimitSidebar";

interface Props {
  siteId: string;
  siteUrl: string;
  pageLimit: number;
  existingPages: {
    url: string;
    label: string;
    pageType: string;
    importance: string;
  }[];
}

export function PageDiscoveryList({
  siteId,
  siteUrl,
  pageLimit,
  existingPages,
}: Props) {
  const router = useRouter();
  const [pages, setPages] = useState<SelectablePage[]>([]);
  const [discovering, setDiscovering] = useState(true);
  const [discoverySource, setDiscoverySource] = useState<"sitemap" | "none">(
    "sitemap"
  );
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const homepage = useMemo(() => `${siteUrl}/`, [siteUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = new Map(existingPages.map((p) => [p.url, p]));
      let discovered: { url: string }[] = [];
      let source: "sitemap" | "none" = "none";
      try {
        const res = await fetch(`/api/sites/${siteId}/discover-pages`, {
          method: "POST",
        });
        if (res.ok) {
          const body = await res.json();
          discovered = body.discovered ?? [];
          source = body.source ?? "none";
          if (!cancelled) setTruncated(Boolean(body.truncated));
        }
      } catch {
        // discovery failure falls through to the manual path
      }
      if (cancelled) return;

      const byUrl = new Map<string, SelectablePage>();
      // Homepage first, pre-selected (PRD § 8).
      byUrl.set(homepage, {
        url: homepage,
        label: existing.get(homepage)?.label ?? "Homepage",
        pageType: existing.get(homepage)?.pageType ?? "home",
        importance: existing.get(homepage)?.importance ?? "critical",
        selected: true,
      });
      for (const p of existingPages) {
        if (!byUrl.has(p.url)) {
          byUrl.set(p.url, { ...p, selected: true });
        }
      }
      for (const d of discovered) {
        if (!byUrl.has(d.url)) {
          byUrl.set(d.url, {
            url: d.url,
            label: "",
            pageType: "other",
            importance: "normal",
            selected: false,
          });
        }
      }
      setPages([...byUrl.values()]);
      setDiscoverySource(source);
      setDiscovering(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const selected = pages.filter((p) => p.selected);

  const updatePage = useCallback(
    (url: string, patch: Partial<SelectablePage>) => {
      setPages((prev) =>
        prev.map((p) => (p.url === url ? { ...p, ...patch } : p))
      );
    },
    []
  );

  function addManualUrl(url: string): string | null {
    let normalized: URL;
    try {
      normalized = new URL(url.includes("://") ? url : `https://${url}`);
    } catch {
      return "That doesn't look like a valid URL.";
    }
    if (normalized.origin !== new URL(siteUrl).origin) {
      return `Pages must be on ${siteUrl}.`;
    }
    const clean = normalized.href.replace(/#.*$/, "");
    if (pages.some((p) => p.url === clean || p.url === clean.replace(/\/$/, ""))) {
      return "That page is already in the list.";
    }
    setPages((prev) => [
      {
        url: clean,
        label: "",
        pageType: "other",
        importance: "normal",
        selected: true,
      },
      ...prev,
    ]);
    return null;
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/sites/${siteId}/pages`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pages: selected.map((p) => ({
          url: p.url,
          label: p.label || undefined,
          pageType: p.pageType,
          importance: p.importance,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "We couldn't save your pages. Try again.");
      return;
    }
    router.push(`/sites/${siteId}`);
    router.refresh();
  }

  if (discovering) {
    return (
      <Card className="flex items-center gap-3 py-10 text-sm text-on-surface-secondary">
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary"
        />
        Reading your sitemap…
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {discoverySource === "none" && (
          <InfoBanner>
            No sitemap found — add the pages you want monitored manually below.
          </InfoBanner>
        )}
        {truncated && (
          <InfoBanner>
            Your sitemap has more than 500 pages — showing the first 500.
          </InfoBanner>
        )}

        <ManualUrlInput onAdd={addManualUrl} />

        <Card className="p-0">
          <ul className="divide-y divide-border">
            {pages.map((page) => (
              <PageRow
                key={page.url}
                page={page}
                atLimit={!page.selected && selected.length >= pageLimit}
                onChange={updatePage}
              />
            ))}
          </ul>
        </Card>

        {error && (
          <p role="alert" className="text-sm font-medium text-severity-critical">
            {error}
          </p>
        )}
      </div>

      <PlanLimitSidebar
        selectedCount={selected.length}
        pageLimit={pageLimit}
        saving={saving}
        canSave={selected.length > 0 && selected.length <= pageLimit}
        onSave={handleSave}
      />
    </div>
  );
}
