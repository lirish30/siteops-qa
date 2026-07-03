import { Card } from "@/components/ui/card";

export const metadata = { title: "Billing — SiteOps QA" };

// Stub — real plans, usage, and Stripe checkout land in Phase 5.
export default function BillingPage() {
  return (
    <main className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <Card className="py-12 text-center">
        <p className="text-[15px] font-semibold">You&apos;re on the free trial.</p>
        <p className="mt-1 text-sm text-on-surface-secondary">
          Plans and upgrades are coming soon — your trial includes 1 site and 5 pages.
        </p>
      </Card>
    </main>
  );
}
