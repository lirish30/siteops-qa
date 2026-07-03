import { NextResponse } from "next/server";
import { getPlanLimits } from "@siteops/shared";

// 402 shape shared by every plan-limit rejection (PRD § 4).
export function planLimitResponse(message: string): NextResponse {
  return NextResponse.json({ error: message, upgrade: true }, { status: 402 });
}

/**
 * Plan-limit checks (FR-022, partial — trial expiry + billing status land in
 * Phase 5). Pure predicates so routes decide the response shape.
 */
export function withinSiteLimit(plan: string, currentSiteCount: number): boolean {
  return currentSiteCount < getPlanLimits(plan).sites;
}

export function withinPageLimit(plan: string, pageCount: number): boolean {
  return pageCount <= getPlanLimits(plan).pagesPerSite;
}
