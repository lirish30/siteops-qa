"use client";

/* eslint-disable @next/next/no-img-element -- scan images are private signed URLs */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Viewport = "desktop" | "mobile";

interface ViewportImages {
  baseline: string | null;
  current: string | null;
  diff: string | null;
  diffRatio: number | null;
}

export function ImageCompare({
  images,
  pageLabel,
}: {
  images: Record<Viewport, ViewportImages>;
  pageLabel: string;
}) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const selected = images[viewport];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Image comparison</h2>
          <p className="text-xs text-on-surface-secondary">
            {selected.diffRatio === null
              ? "No visual diff was generated for this viewport."
              : `${(selected.diffRatio * 100).toFixed(selected.diffRatio < 0.01 ? 2 : 1)}% visual difference`}
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-surface-sunken p-1">
          {(["desktop", "mobile"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setViewport(item)}
              className={
                item === viewport
                  ? "rounded-sm bg-surface px-3 py-1.5 text-xs font-semibold shadow-card"
                  : "rounded-sm px-3 py-1.5 text-xs font-medium text-on-surface-secondary"
              }
            >
              {item === "desktop" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ImagePanel
          label="Baseline"
          src={selected.baseline}
          alt={`Baseline ${viewport} screenshot for ${pageLabel}`}
          onOpen={setLightbox}
        />
        <ImagePanel
          label="Current"
          src={selected.current}
          alt={`Current ${viewport} screenshot for ${pageLabel}`}
          onOpen={setLightbox}
        />
        <ImagePanel
          label="Diff overlay"
          src={selected.diff}
          alt={`Diff overlay for ${pageLabel}, ${viewport}`}
          onOpen={setLightbox}
        />
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.alt}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-on-surface/70 p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="Close full-size screenshot"
            className="fixed right-4 top-4 rounded-full bg-surface px-3 py-1 text-sm font-medium shadow-overlay"
          >
            Close x
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="max-w-5xl rounded-md shadow-overlay"
          />
        </div>
      )}
    </Card>
  );
}

function ImagePanel({
  label,
  src,
  alt,
  onOpen,
}: {
  label: string;
  src: string | null;
  alt: string;
  onOpen: (image: { src: string; alt: string }) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-xs font-semibold text-on-surface-secondary">{label}</p>
      {src ? (
        <button
          onClick={() => onOpen({ src, alt })}
          className="h-72 overflow-hidden rounded-md border border-border bg-surface-sunken text-left"
        >
          <img src={src} alt={alt} className="h-full w-full object-cover object-top" />
        </button>
      ) : (
        <div className="h-72 rounded-md border border-border bg-surface-sunken p-3">
          <Skeleton className="h-full w-full" />
        </div>
      )}
    </div>
  );
}
