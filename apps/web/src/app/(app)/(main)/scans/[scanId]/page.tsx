import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Scan — SiteOps QA" };

// Placeholder shell for TASK-041 (Scan Results screen). Keeps the run-scan
// flow unbroken: shows live-ish status via refresh until the real results
// screen with polling, verdict banner, and page cards replaces this.
export default async function ScanPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = await params;
  const supabase = await createClient();

  const { data: scan } = await supabase
    .from("scans")
    .select("id, site_id, status, user_note, pages_total, pages_done, overall_severity")
    .eq("id", scanId)
    .maybeSingle();
  if (!scan) notFound();

  const running = scan.status === "queued" || scan.status === "running";

  return (
    <main className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Scan</h1>
      <Card className="flex flex-col gap-2 py-6">
        <p className="text-[15px] font-semibold" role="status">
          {running
            ? `Scanning… ${scan.pages_done} of ${scan.pages_total} pages`
            : scan.status === "complete"
              ? `Scan complete — verdict: ${scan.overall_severity ?? "pass"}`
              : "Scan failed"}
        </p>
        {scan.user_note && (
          <p className="text-sm text-on-surface-secondary">
            Note: {scan.user_note}
          </p>
        )}
        <p className="text-xs text-on-surface-muted">
          The full results screen is coming next — refresh for the latest
          status.
        </p>
        <Link
          href={`/sites/${scan.site_id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to site
        </Link>
      </Card>
    </main>
  );
}
