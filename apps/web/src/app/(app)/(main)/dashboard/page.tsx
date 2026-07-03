import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Dashboard — SiteOps QA" };

export default function DashboardPage() {
  return (
    <main className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        {/* Enabled in Phase 1 (TASK-018) once the Add Site flow exists. */}
        <Button disabled title="Coming soon — site management lands in the next phase">
          Add site
        </Button>
      </div>

      <Card className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-[15px] font-semibold">
          Add your first site and we&apos;ll find its pages for you.
        </p>
        <p className="text-sm text-on-surface-secondary">
          Baselines, scans, and client-ready receipts start here.
        </p>
      </Card>
    </main>
  );
}
