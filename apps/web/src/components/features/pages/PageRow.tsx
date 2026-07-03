"use client";

import { useId } from "react";
import { PAGE_TYPES } from "@siteops/shared";

export interface SelectablePage {
  url: string;
  label: string;
  pageType: string;
  importance: string;
  selected: boolean;
}

export function PageRow({
  page,
  atLimit,
  onChange,
}: {
  page: SelectablePage;
  atLimit: boolean;
  onChange: (url: string, patch: Partial<SelectablePage>) => void;
}) {
  const id = useId();
  const path = (() => {
    try {
      const u = new URL(page.url);
      return u.pathname + u.search;
    } catch {
      return page.url;
    }
  })();

  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={page.selected}
          disabled={atLimit}
          title={atLimit ? "You've hit your plan's page limit" : undefined}
          onChange={(e) => onChange(page.url, { selected: e.target.checked })}
          className="h-4 w-4 shrink-0 accent-primary"
        />
        <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
          <span className="block truncate font-mono text-xs text-on-surface-secondary">
            {path}
          </span>
        </label>
      </div>

      {page.selected && (
        <div className="flex flex-wrap items-center gap-2 pl-7 sm:pl-0">
          <input
            type="text"
            value={page.label}
            onChange={(e) => onChange(page.url, { label: e.target.value })}
            placeholder="Label (e.g. Contact)"
            aria-label={`Label for ${path}`}
            className="h-8 w-36 rounded-md border border-border bg-surface px-2 text-xs focus:border-focus-ring focus:outline-none"
          />
          <select
            value={page.pageType}
            onChange={(e) => onChange(page.url, { pageType: e.target.value })}
            aria-label={`Page type for ${path}`}
            className="h-8 rounded-md border border-border bg-surface px-2 text-xs focus:border-focus-ring focus:outline-none"
          >
            {PAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              onChange(page.url, {
                importance:
                  page.importance === "critical" ? "normal" : "critical",
              })
            }
            aria-pressed={page.importance === "critical"}
            className={
              page.importance === "critical"
                ? "h-8 rounded-md bg-severity-critical-subtle px-2 text-xs font-medium text-severity-critical"
                : "h-8 rounded-md border border-border px-2 text-xs text-on-surface-secondary hover:bg-surface-sunken"
            }
          >
            {page.importance === "critical" ? "● Critical" : "Mark critical"}
          </button>
        </div>
      )}
    </li>
  );
}
