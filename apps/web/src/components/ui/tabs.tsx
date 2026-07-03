"use client";

import { clsx } from "clsx";

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={clsx("inline-flex gap-1 rounded-md bg-surface-sunken p-1", className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === active}
          onClick={() => onChange(tab.id)}
          className={clsx(
            "rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors",
            tab.id === active
              ? "bg-surface text-on-surface shadow-card"
              : "text-on-surface-secondary hover:text-on-surface"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
