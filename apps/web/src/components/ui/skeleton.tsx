import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "animate-pulse rounded-md bg-surface-sunken motion-reduce:animate-none",
        className
      )}
    />
  );
}
