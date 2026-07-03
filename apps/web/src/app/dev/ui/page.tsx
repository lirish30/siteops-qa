"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SeverityBadge, Chip, type BadgeSeverity } from "@/components/ui/badge";
import { VerdictBanner, InfoBanner } from "@/components/ui/banner";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/ui/toast";

const SEVERITIES: BadgeSeverity[] = ["critical", "high", "medium", "low", "info", "pass"];

function Playground() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState("desktop");
  const { toast } = useToast();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">UI playground</h1>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Run scan</Button>
          <Button variant="secondary">Cancel</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled secondary
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Inputs</h2>
        <Input label="Site URL" placeholder="https://example.com" />
        <Input
          label="Email"
          defaultValue="not-an-email"
          error="That email or password didn't match."
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Severity badges</h2>
        <div className="flex flex-wrap gap-2">
          {SEVERITIES.map((s) => (
            <SeverityBadge key={s} severity={s} />
          ))}
          <Chip>3 of 5 pages</Chip>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Verdict banners</h2>
        <VerdictBanner verdict="pass">No issues found</VerdictBanner>
        <VerdictBanner verdict="review">2 things worth a look</VerdictBanner>
        <VerdictBanner verdict="fail">Issues found on 3 pages</VerdictBanner>
        <InfoBanner>We couldn&apos;t find a sitemap — you can add pages manually.</InfoBanner>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Tabs, progress, skeleton</h2>
        <Tabs
          tabs={[
            { id: "desktop", label: "Desktop" },
            { id: "mobile", label: "Mobile" },
          ]}
          active={tab}
          onChange={setTab}
        />
        <Progress value={4} max={8} label="Scan progress" />
        <div className="flex gap-3">
          <Skeleton className="h-16 w-24" />
          <Skeleton className="h-16 flex-1" />
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Overlays</h2>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button variant="secondary" onClick={() => toast("Saved.")}>
            Toast
          </Button>
          <Button variant="secondary" onClick={() => toast("That didn't save. Try again.", "error")}>
            Error toast
          </Button>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Set as new baseline?">
          <p className="mb-4 text-sm text-on-surface-secondary">
            Future scans will compare against this scan&apos;s state.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </Card>

      <Card feature className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Feature card</h2>
        <p className="text-sm opacity-90">One per screen, maximum.</p>
      </Card>
    </main>
  );
}

export default function DevUiPage() {
  // Dev-only playground — never served in production builds.
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <ToastProvider>
      <Playground />
    </ToastProvider>
  );
}
