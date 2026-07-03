"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "login" | "signup" | "reset";

const HEADINGS: Record<Mode, { title: string; cta: string }> = {
  login: { title: "Welcome back", cta: "Log in" },
  signup: { title: "Create your account", cta: "Sign up" },
  reset: { title: "Reset your password", cta: "Send reset link" },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = searchParams.get("next") ?? "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError("That email or password didn't match.");
          return;
        }
        router.push(next);
        router.refresh();
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback?next=${next}` },
        });
        if (error) {
          setError(
            error.message.includes("already registered")
              ? "You already have an account with that email — try logging in."
              : "We couldn't create your account. Check your email and try again."
          );
          return;
        }
        // If email confirmation is off (dev), a session exists already.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setNotice("Check your inbox — we sent you a confirmation link.");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/callback?next=/settings`,
        });
        if (error) {
          setError("We couldn't send the reset email. Give it another try.");
          return;
        }
        setNotice("Check your inbox — the reset link is on its way.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email first and we'll send you a login link.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${next}` },
    });
    setBusy(false);
    if (error) {
      setError("We couldn't send the login link. Give it another try.");
      return;
    }
    setNotice("Check your inbox — your login link is on its way.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{HEADINGS[mode].title}</h1>

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {mode !== "reset" && (
        <Input
          label="Password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
        />
      )}
      {mode === "reset" && error && (
        <p className="text-xs font-medium text-severity-critical">{error}</p>
      )}

      {notice && (
        <p className="rounded-md bg-severity-pass-subtle p-3 text-sm text-severity-pass">
          {notice}
        </p>
      )}

      <Button type="submit" disabled={busy}>
        {busy ? "One moment…" : HEADINGS[mode].cta}
      </Button>

      {mode === "login" && (
        <Button type="button" variant="secondary" disabled={busy} onClick={handleMagicLink}>
          Email me a login link instead
        </Button>
      )}

      <div className="flex justify-between text-sm text-on-surface-secondary">
        {mode === "login" ? (
          <>
            <Link className="hover:text-primary" href="/signup">
              Create an account
            </Link>
            <Link className="hover:text-primary" href="/reset">
              Forgot password?
            </Link>
          </>
        ) : (
          <Link className="hover:text-primary" href="/login">
            Back to login
          </Link>
        )}
      </div>
    </form>
  );
}
