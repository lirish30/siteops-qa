"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/billing", label: "Billing" },
];

export function TopNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-6 px-5">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          SiteOps <span className="text-primary">QA</span>
        </Link>

        <nav className="flex gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "rounded-md px-3 py-2 text-sm font-semibold",
                pathname.startsWith(item.href)
                  ? "bg-primary-subtle text-primary"
                  : "text-on-surface-secondary hover:text-on-surface"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="relative ml-auto">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary"
          >
            {email.charAt(0).toUpperCase()}
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-10 z-20 w-56 rounded-md border border-border bg-surface p-1 shadow-overlay"
            >
              <p className="truncate px-3 py-2 text-xs text-on-surface-muted">{email}</p>
              <Link
                role="menuitem"
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="block rounded-sm px-3 py-2 text-sm hover:bg-surface-sunken"
              >
                Settings
              </Link>
              <button
                role="menuitem"
                onClick={signOut}
                className="block w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-surface-sunken"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
