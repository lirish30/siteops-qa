import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrg, isGuardResponse } from "@/lib/auth-guards";

type Params = { params: Promise<{ issueId: string }> };

const patchIssueSchema = z
  .object({
    status: z.enum(["expected", "resolved", "dismissed"]).optional(),
    humanNotes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((body) => body.status !== undefined || body.humanNotes !== undefined, {
    message: "Nothing to update",
  });

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { supabase, orgId } = ctx;
  const { issueId } = await params;

  const parsed = patchIssueSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid issue update." }, { status: 400 });
  }

  const { data: issue } = await supabase
    .from("issues")
    .select("id, scans!inner ( sites!inner ( org_id ) )")
    .eq("id", issueId)
    .eq("scans.sites.org_id", orgId)
    .maybeSingle();
  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const update: { status?: string; human_notes?: string | null } = {};
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.humanNotes !== undefined) {
    update.human_notes = parsed.data.humanNotes || null;
  }

  const { data: updated, error } = await supabase
    .from("issues")
    .update(update)
    .eq("id", issueId)
    .select(
      "id, page_id, type, severity, needs_review, title, description, evidence, recommendation, status, human_notes, created_at"
    )
    .single();
  if (error || !updated) {
    return NextResponse.json(
      { error: "We couldn't update that issue. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: updated.id,
    pageId: updated.page_id,
    type: updated.type,
    severity: updated.severity,
    needsReview: updated.needs_review,
    title: updated.title,
    description: updated.description,
    evidence: updated.evidence,
    recommendation: updated.recommendation,
    status: updated.status,
    humanNotes: updated.human_notes,
    createdAt: updated.created_at,
  });
}
