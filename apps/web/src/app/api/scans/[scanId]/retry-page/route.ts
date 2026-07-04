import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrg, isGuardResponse } from "@/lib/auth-guards";
import { inngest } from "@/lib/inngest";

type Params = { params: Promise<{ scanId: string }> };

const bodySchema = z.object({ pageId: z.string().uuid() });

// POST /api/scans/:id/retry-page — re-capture one failed page of a baseline
// run (TASK-031 Retry button). Sends app/baseline.page-retry to the worker.
export async function POST(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { supabase, orgId } = ctx;
  const { scanId } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { pageId } = parsed.data;

  const { data: scan } = await supabase
    .from("scans")
    .select("id, site_id, trigger_type, sites!inner ( org_id )")
    .eq("id", scanId)
    .eq("sites.org_id", orgId)
    .maybeSingle();
  if (!scan || scan.trigger_type !== "baseline") {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const { data: failedRow } = await supabase
    .from("baselines")
    .select("id")
    .eq("scan_id", scanId)
    .eq("page_id", pageId)
    .eq("status", "failed")
    .limit(1)
    .maybeSingle();
  if (!failedRow) {
    return NextResponse.json(
      { error: "That page isn't in a failed state." },
      { status: 409 }
    );
  }

  try {
    await inngest.send({
      name: "app/baseline.page-retry",
      data: { siteId: scan.site_id, scanId, pageId },
    });
  } catch (error) {
    console.error("Failed to send baseline page retry to Inngest", error);
    return NextResponse.json(
      { error: "We couldn't reach the scan service. Try again in a minute." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
