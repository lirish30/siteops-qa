import { clsx } from "clsx";
import { useId, type InputHTMLAttributes } from "react";

export function Input({
  label,
  error,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium tracking-wide text-on-surface-secondary"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={clsx(
          "h-10 rounded-md border bg-surface px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-muted",
          "focus:border-focus-ring focus:outline-none focus-visible:outline-2",
          error ? "border-severity-critical" : "border-border",
          className
        )}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs font-medium text-severity-critical">
          {error}
        </p>
      )}
    </div>
  );
}
