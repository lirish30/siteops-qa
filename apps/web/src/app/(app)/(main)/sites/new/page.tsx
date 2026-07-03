import { Card } from "@/components/ui/card";
import { AddSiteForm } from "@/components/features/sites/AddSiteForm";

export const metadata = { title: "Add site — SiteOps QA" };

export default function AddSitePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add a site</h1>
        <p className="mt-1 text-sm text-on-surface-secondary">
          Enter the site&apos;s address and we&apos;ll check what it&apos;s running.
        </p>
      </div>
      <Card>
        <AddSiteForm />
      </Card>
    </main>
  );
}
