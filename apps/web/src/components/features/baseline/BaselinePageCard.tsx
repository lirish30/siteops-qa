"use client";

/* eslint-disable @next/next/no-img-element -- signed URLs are short-lived; next/image caching hurts here */

import { useState } from "react";
import type { IgnoredRegion } from "@siteops/shared";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/badge";
import { IgnoredRegionsEditor } from "./IgnoredRegionsEditor";

export interface BaselinePageData {
  baselineId: string;
  pageId: string;
  label: string | null;
  url: string;
  capturedAt: string;
  httpStatus: number | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonical: string | null;
  consoleErrorCount: number;
  brokenLinkCount: number;
  forms: { selector: string; fieldCount: number; hasSubmit: boolean; plugin: string }[];
  ctas: { selector: string; text: string; href: string | null }[];
  ignoredRegions: IgnoredRegion[];
  screenshots: {
    desktop: { full: string | null; thumb: string | null };
    mobile: { full: string | null; thumb: string | null };
  };
}

const PLUGIN_NAMES: Record<string, string> = {
  cf7: "Contact Form 7",
  gravity: "Gravity Forms",
  wpforms: "WPForms",
  ninja: "Ninja Forms",
  hubspot: "HubSpot",
  generic: "Form",
};

/** Per-page baseline card (TASK-032): what "baseline" means, made visible. */
export function BaselinePageCard({ page }: { page: BaselinePageData }) {
  const [lightbox, setLightbox] = useState<"desktop" | "mobile" | null>(null);
  const [editing, setEditing] = useState(false);

  const path = new URL(page.url).pathname;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{page.label || path}</p>
          <p className="truncate font-mono text-xs text-on-surface-secondary">{path}</p>
        </div>
        <Chip>{page.httpStatus ? `HTTP ${page.httpStatus}` : "No status"}</Chip>
      </div>

      <div className="flex gap-3">
        {(["desktop", "mobile"] as const).map((viewport) => {
          const shot = page.screenshots[viewport];
          if (!shot.thumb) return null;
          return (
            <button
              key={viewport}
              onClick={() => setLightbox(viewport)}
              className="group relative overflow-hidden rounded-md border border-border"
              aria-label={`View full ${viewport} screenshot of ${page.label || path}`}
            >
              <img
                src={shot.thumb}
                alt={`Baseline screenshot of ${page.label || path}, ${viewport}`}
                className={
                  viewport === "desktop"
                    ? "h-28 w-44 object-cover object-top"
                    : "h-28 w-16 object-cover object-top"
                }
              />
              <span className="absolute inset-x-0 bottom-0 bg-on-surface/60 py-0.5 text-center text-[10px] font-medium text-surface opacity-0 transition-opacity group-hover:opacity-100">
                {viewport}
              </span>
            </button>
          );
        })}
      </div>

      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-on-surface-secondary">Title</dt>
        <dd className="truncate">{page.title ?? "—"}</dd>
        <dt className="text-on-surface-secondary">H1</dt>
        <dd className="truncate">{page.h1 ?? "—"}</dd>
        <dt className="text-on-surface-secondary">Meta description</dt>
        <dd className="truncate">{page.metaDescription ?? "—"}</dd>
        <dt className="text-on-surface-secondary">Canonical</dt>
        <dd className="truncate font-mono">{page.canonical ?? "—"}</dd>
      </dl>

      <div className="flex flex-wrap gap-2 text-xs">
        {page.forms.length > 0 ? (
          page.forms.map((form, i) => (
            <Chip key={i}>
              {PLUGIN_NAMES[form.plugin] ?? "Form"} · {form.fieldCount} field
              {form.fieldCount === 1 ? "" : "s"} · submit {form.hasSubmit ? "✓" : "✗"}
            </Chip>
          ))
        ) : (
          <Chip>No forms detected</Chip>
        )}
        <Chip>
          {page.consoleErrorCount} console error{page.consoleErrorCount === 1 ? "" : "s"}
        </Chip>
        <Chip>
          {page.brokenLinkCount} broken link{page.brokenLinkCount === 1 ? "" : "s"}
        </Chip>
      </div>

      {page.ctas.length > 0 && (
        <div className="text-xs">
          <p className="mb-1 font-medium text-on-surface-secondary">CTAs watched</p>
          <ul className="flex flex-wrap gap-1.5">
            {page.ctas.map((cta, i) => (
              <li key={i}>
                <Chip>{cta.text}</Chip>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-on-surface-secondary">
          {page.ignoredRegions.length > 0
            ? `${page.ignoredRegions.length} ignored region${page.ignoredRegions.length === 1 ? "" : "s"}`
            : "No ignored regions"}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="font-medium text-primary hover:underline"
          disabled={!page.screenshots.desktop.full}
        >
          Ignore a region
        </button>
      </div>

      {lightbox && (
        <Lightbox
          src={page.screenshots[lightbox].full}
          alt={`Baseline screenshot of ${page.label || path}, ${lightbox}, full size`}
          onClose={() => setLightbox(null)}
        />
      )}

      {editing && (
        <IgnoredRegionsEditor
          pageId={page.pageId}
          screenshots={{
            desktop: page.screenshots.desktop.full,
            mobile: page.screenshots.mobile.full,
          }}
          initialRegions={page.ignoredRegions}
          onClose={() => setEditing(false)}
        />
      )}
    </Card>
  );
}

function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string | null;
  alt: string;
  onClose: () => void;
}) {
  if (!src) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-on-surface/70 p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close full-size screenshot"
        className="fixed right-4 top-4 rounded-full bg-surface px-3 py-1 text-sm font-medium shadow-overlay"
      >
        Close ✕
      </button>
      <img src={src} alt={alt} className="max-w-4xl rounded-md shadow-overlay" />
    </div>
  );
}
