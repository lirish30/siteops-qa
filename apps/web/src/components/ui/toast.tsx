"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { clsx } from "clsx";

type Toast = { id: number; message: string; tone: "default" | "error" };

const ToastContext = createContext<{
  toast: (message: string, tone?: Toast["tone"]) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: Toast["tone"] = "default") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "pointer-events-auto rounded-md px-4 py-3 text-sm font-medium shadow-overlay",
              t.tone === "error"
                ? "bg-severity-critical-subtle text-severity-critical"
                : "bg-on-surface text-surface"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
