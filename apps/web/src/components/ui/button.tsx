import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-[18px] py-[10px] text-sm font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:bg-border disabled:text-on-surface-muted disabled:border-0",
        variant === "primary" &&
          "bg-primary text-on-primary hover:bg-primary-hover",
        variant === "secondary" &&
          "border border-border-strong bg-surface text-on-surface hover:bg-surface-sunken",
        className
      )}
      {...props}
    />
  );
}
