import { notFound } from "next/navigation";
import { getPlanLimits } from "@siteops/shared";
import { createClient } from "@/lib/supabase/server";
import { PageDiscoveryList } from "@/components/features/pages/PageDiscoveryList";

export const metadata = { title: "Choose pages — SiteOps QA" };

export default async function PageDiscoveryPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const supabase = await createClient();

  const [{ data: site }, { data: membership }] = await Promise.all([
    supabase
      .from("sites")
      .select(
        "id, url, name, monitored_pages ( url, label, page_type, importance, is_active )"
      )
      .eq("id", siteId)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("organizations ( plan )")
      .limit(1)
      .maybeSingle(),
  ]);

  if (!site) notFound();
  const plan = membership?.organizations?.plan ?? "trial";
  const pageLimit = getPlanLimits(plan).pagesPerSite;

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose pages to monitor
        </h1>
        <p className="mt-1 text-sm text-on-surface-secondary">
          {site.name} · {site.url}
        </p>
      </div>
      <PageDiscoveryList
        siteId={site.id}
        siteUrl={site.url}
        pageLimit={pageLimit}
        existingPages={site.monitored_pages
          .filter((p) => p.is_active)
          .map((p) => ({
            url: p.url,
            label: p.label ?? "",
            pageType: p.page_type,
            importance: p.importance,
          }))}
      />
    </main>
  );
}
