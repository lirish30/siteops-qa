import { NextResponse } from "next/server";
import { requireOrg, isGuardResponse } from "@/lib/auth-guards";
import { inngest } from "@/lib/inngest";

type Params = { params: Promise<{ scanId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { supabase, orgId } = ctx;
  const { scanId } = await params;

  const { data: scan } = await supabase
    .from("scans")
    .select("id, site_id, status, sites!inner ( org_id )")
    .eq("id", scanId)
    .eq("sites.org_id", orgId)
    .maybeSingle();
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }
  if (scan.status !== "complete") {
    return NextResponse.json(
      { error: "Only a completed scan can become the new baseline." },
      { status: 409 }
    );
  }

  const { count } = await supabase
    .from("page_scan_results")
    .select("id", { count: "exact", head: true })
    .eq("scan_id", scanId)
    .eq("status", "complete");
  if (!count) {
    return NextResponse.json(
      { error: "This scan has no successful page captures to use as a baseline." },
      { status: 409 }
    );
  }

  const { data: activeScan } = await supabase
    .from("scans")
    .select("id")
    .eq("site_id", scan.site_id)
    .in("status", ["queued", "running"])
    .limit(1)
    .maybeSingle();
  if (activeScan) {
    return NextResponse.json(
      { error: "A scan is already running for this site." },
      { status: 409 }
    );
  }

  try {
    await inngest.send({
      name: "app/scan.rebaseline",
      data: { scanId, siteId: scan.site_id },
    });
  } catch (error) {
    console.error("Failed to send rebaseline request to Inngest", error);
    return NextResponse.json(
      { error: "We couldn't reach the scan service. Try again in a minute." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
