"use client";

/* eslint-disable @next/next/no-img-element -- signed URLs are short-lived; next/image caching hurts here */

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IgnoredRegion } from "@siteops/shared";
import { Button } from "@/components/ui/button";

interface DraftRect {
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Draw-to-ignore editor (TASK-033). Click-drag rectangles over the baseline
 * screenshot; coordinates are stored in natural-image pixels (scaled from the
 * displayed size). Minimal by design: delete + redraw instead of resize.
 */
export function IgnoredRegionsEditor({
  pageId,
  screenshots,
  initialRegions,
  onClose,
}: {
  pageId: string;
  screenshots: { desktop: string | null; mobile: string | null };
  initialRegions: IgnoredRegion[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [regions, setRegions] = useState<IgnoredRegion[]>(initialRegions);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Callback ref instead of onLoad alone: cached images can finish loading
  // before React attaches the load handler, which would leave sizes null and
  // make drawing silently do nothing. Must be stable (useCallback) and only
  // set changed values — a fresh ref re-runs on every render.
  const syncSizes = useCallback((img: HTMLImageElement) => {
    const next = { w: img.naturalWidth, h: img.naturalHeight };
    setNaturalSize((prev) => (prev?.w === next.w && prev?.h === next.h ? prev : next));
    const disp = { w: img.clientWidth, h: img.clientHeight };
    setDisplaySize((prev) => (prev?.w === disp.w && prev?.h === disp.h ? prev : disp));
  }, []);
  const attachImg = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node;
      if (node?.complete && node.naturalWidth > 0) syncSizes(node);
    },
    [syncSizes]
  );

  const src = screenshots[viewport];

  function displayedToNatural(rect: DraftRect): IgnoredRegion | null {
    const img = imgRef.current;
    if (!img || !naturalSize) return null;
    const scaleX = naturalSize.w / img.clientWidth;
    const scaleY = naturalSize.h / img.clientHeight;
    const region = {
      x: Math.max(0, Math.round(rect.x * scaleX)),
      y: Math.max(0, Math.round(rect.y * scaleY)),
      width: Math.round(rect.width * scaleX),
      height: Math.round(rect.height * scaleY),
      viewport,
    };
    if (region.width < 4 || region.height < 4) return null; // ignore stray clicks
    return region;
  }

  function naturalToDisplayed(region: IgnoredRegion) {
    if (!displaySize || !naturalSize) return null;
    const scaleX = displaySize.w / naturalSize.w;
    const scaleY = displaySize.h / naturalSize.h;
    return {
      left: region.x * scaleX,
      top: region.y * scaleY,
      width: region.width * scaleX,
      height: region.height * scaleY,
    };
  }

  function pointerPos(e: React.PointerEvent): { x: number; y: number } {
    const rect = imgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(e.clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(e.clientY - rect.top, 0), rect.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!imgRef.current || !naturalSize) return;
    e.preventDefault();
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Inactive pointer (e.g. synthetic events) — capture is best-effort.
    }
    const { x, y } = pointerPos(e);
    setDraft({ startX: x, startY: y, x, y, width: 0, height: 0 });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draft) return;
    const { x, y } = pointerPos(e);
    setDraft({
      ...draft,
      x: Math.min(draft.startX, x),
      y: Math.min(draft.startY, y),
      width: Math.abs(x - draft.startX),
      height: Math.abs(y - draft.startY),
    });
  }

  function handlePointerUp() {
    if (!draft) return;
    const region = displayedToNatural(draft);
    setDraft(null);
    if (region) setRegions((prev) => [...prev, region]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ignoredRegions: regions }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "We couldn't save those regions. Try again.");
      return;
    }
    router.refresh();
    onClose();
  }

  const viewportRegions = regions.filter((r) => r.viewport === viewport);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ignore regions editor"
      className="fixed inset-0 z-50 flex flex-col bg-on-surface/70 p-4 sm:p-8"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-3 rounded-lg bg-surface p-4 shadow-overlay">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Ignore regions</h2>
            <p className="text-xs text-on-surface-secondary">
              Drag over areas that change by design — we&apos;ll skip them when
              comparing scans. Click a region&apos;s ✕ to remove it.
            </p>
          </div>
          <div className="flex gap-1 rounded-md border border-border p-0.5 text-xs">
            {(["desktop", "mobile"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewport(v)}
                disabled={!screenshots[v]}
                className={
                  viewport === v
                    ? "rounded bg-primary px-2 py-1 font-medium text-on-primary"
                    : "rounded px-2 py-1 text-on-surface-secondary disabled:opacity-40"
                }
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-surface-sunken">
          {src ? (
            <div
              className="relative inline-block cursor-crosshair touch-none select-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <img
                ref={attachImg}
                src={src}
                alt={`Baseline screenshot, ${viewport} — drag to ignore a region`}
                draggable={false}
                className="w-full"
                onLoad={(e) => syncSizes(e.currentTarget)}
              />
              {viewportRegions.map((region, i) => {
                const pos = naturalToDisplayed(region);
                if (!pos) return null;
                return (
                  <div
                    key={`${region.x}-${region.y}-${i}`}
                    className="absolute border-2 border-severity-critical bg-severity-critical/20"
                    style={pos}
                  >
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() =>
                        setRegions((prev) => prev.filter((r) => r !== region))
                      }
                      aria-label="Remove ignored region"
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-severity-critical text-[10px] font-bold text-surface"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {draft && (
                <div
                  className="absolute border-2 border-dashed border-severity-critical bg-severity-critical/10"
                  style={{
                    left: draft.x,
                    top: draft.y,
                    width: draft.width,
                    height: draft.height,
                  }}
                />
              )}
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-on-surface-secondary">
              No {viewport} screenshot available.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-on-surface-secondary">
            {regions.length} region{regions.length === 1 ? "" : "s"} total
            {error && <span className="ml-2 text-severity-critical">{error}</span>}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save regions"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
