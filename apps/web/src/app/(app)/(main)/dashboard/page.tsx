import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { SiteRow } from "@/components/features/dashboard/SiteRow";

export const metadata = { title: "Dashboard — SiteOps QA" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select(
      "id, url, name, wp_detection, last_scan_at, scans ( overall_severity, completed_at )"
    )
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "scans", ascending: false })
    .limit(1, { referencedTable: "scans" });

  const rows = (sites ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    wp_detection: s.wp_detection,
    last_scan_at: s.last_scan_at,
    lastScanSeverity: s.scans[0]?.overall_severity ?? null,
  }));

  return (
    <main className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <Link
          href="/sites/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-[18px] py-[10px] text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
        >
          Add site
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-[15px] font-semibold">
            Add your first site and we&apos;ll find its pages for you.
          </p>
          <p className="text-sm text-on-surface-secondary">
            Baselines, scans, and client-ready receipts start here.
          </p>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((site) => (
              <SiteRow key={site.id} site={site} />
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
