import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({
  feature = false,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { feature?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-lg p-5 shadow-card",
        feature
          ? "bg-primary text-on-primary"
          : "border border-border bg-surface text-on-surface",
        className
      )}
      {...props}
    />
  );
}
