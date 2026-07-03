import { clsx } from "clsx";

export type Verdict = "pass" | "review" | "fail";

const STYLES: Record<Verdict, string> = {
  pass: "bg-severity-pass-subtle text-severity-pass",
  review: "bg-severity-medium-subtle text-severity-medium",
  fail: "bg-severity-critical-subtle text-severity-critical",
};

const ICONS: Record<Verdict, string> = {
  pass: "✓",
  review: "!",
  fail: "✕",
};

export function VerdictBanner({
  verdict,
  children,
  className,
}: {
  verdict: Verdict;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={clsx(
        "flex items-center gap-3 rounded-lg p-4 text-[15px] font-semibold",
        STYLES[verdict],
        className
      )}
    >
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-current text-xs"
      >
        {ICONS[verdict]}
      </span>
      {children}
    </div>
  );
}

export function InfoBanner({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={clsx(
        "rounded-lg bg-severity-info-subtle p-4 text-sm text-severity-info",
        className
      )}
    >
      {children}
    </div>
  );
}
