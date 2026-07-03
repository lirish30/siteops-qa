export type Plan =
  | "trial"
  | "freelancer"
  | "agency_starter"
  | "agency_pro"
  | "agency_scale";

export interface PlanLimits {
  sites: number;
  pagesPerSite: number;
  scheduledScans: boolean;
}

// PRD § 10 Pricing Model Implementation. Scheduled scans are post-MVP even
// where the plan includes them; the flag exists for later enforcement.
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  trial: { sites: 1, pagesPerSite: 5, scheduledScans: false },
  freelancer: { sites: 5, pagesPerSite: 25, scheduledScans: false },
  agency_starter: { sites: 25, pagesPerSite: 50, scheduledScans: true },
  agency_pro: { sites: 75, pagesPerSite: 100, scheduledScans: true },
  agency_scale: { sites: 150, pagesPerSite: 100, scheduledScans: true },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as Plan) in PLAN_LIMITS ? (plan as Plan) : "trial"];
}
