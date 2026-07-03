import { clsx } from "clsx";

export type BadgeSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "pass";

const STYLES: Record<BadgeSeverity, string> = {
  critical: "bg-severity-critical-subtle text-severity-critical",
  high: "bg-severity-high-subtle text-severity-high",
  medium: "bg-severity-medium-subtle text-severity-medium",
  low: "bg-severity-low-subtle text-severity-low",
  info: "bg-severity-info-subtle text-severity-info",
  pass: "bg-severity-pass-subtle text-severity-pass",
};

const LABELS: Record<BadgeSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
  pass: "Pass",
};

// Severity is always dot + label, never color alone (PRD § 7 Accessibility).
export function SeverityBadge({
  severity,
  label,
  className,
}: {
  severity: BadgeSeverity;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-medium tracking-wide",
        STYLES[severity],
        className
      )}
    >
      <span aria-hidden className="text-[8px] leading-none">
        ●
      </span>
      {label ?? LABELS[severity]}
    </span>
  );
}

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-on-surface-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}
