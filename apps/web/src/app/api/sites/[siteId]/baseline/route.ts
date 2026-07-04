import { NextResponse } from "next/server";
import { requireOrg, isGuardResponse } from "@/lib/auth-guards";
import { inngest } from "@/lib/inngest";

type Params = { params: Promise<{ siteId: string }> };

// POST /api/sites/:id/baseline — queue a baseline capture run (FR-008).
// Creates the scans row (trigger_type=baseline) and hands off to the worker.
export async function POST(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { supabase, userId, orgId } = ctx;
  const { siteId } = await params;

  const { data: site } = await supabase
    .from("sites")
    .select("id, monitored_pages ( id, is_active )")
    .eq("id", siteId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const pagesTotal = site.monitored_pages.filter((p) => p.is_active).length;
  if (pagesTotal === 0) {
    return NextResponse.json(
      { error: "Pick at least one page to monitor before creating a baseline." },
      { status: 400 }
    );
  }

  // One run at a time per site.
  const { data: activeScan } = await supabase
    .from("scans")
    .select("id")
    .eq("site_id", siteId)
    .in("status", ["queued", "running"])
    .limit(1)
    .maybeSingle();
  if (activeScan) {
    return NextResponse.json(
      { error: "A scan is already running for this site." },
      { status: 409 }
    );
  }

  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .insert({
      site_id: siteId,
      trigger_type: "baseline",
      status: "queued",
      pages_total: pagesTotal,
      created_by: userId,
    })
    .select("id")
    .single();
  if (scanError || !scan) {
    return NextResponse.json(
      { error: "We couldn't start the baseline. Try again." },
      { status: 500 }
    );
  }

  try {
    await inngest.send({
      name: "app/baseline.requested",
      data: { siteId, scanId: scan.id },
    });
  } catch (error) {
    console.error("Failed to send baseline request to Inngest", error);
    // Don't leave a stuck queued row if the event never made it out.
    await supabase.from("scans").update({ status: "failed" }).eq("id", scan.id);
    return NextResponse.json(
      { error: "We couldn't reach the scan service. Try again in a minute." },
      { status: 502 }
    );
  }

  return NextResponse.json({ scanId: scan.id }, { status: 202 });
}
