import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/badge";
import { SiteHeader } from "@/components/features/sites/SiteHeader";
import { BaselineStatusCard } from "@/components/features/sites/BaselineStatusCard";

export const metadata = { title: "Site overview — SiteOps QA" };

export default async function SiteOverviewPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, url, name, wp_detection, monitored_pages ( id, url, label, page_type, importance, is_active, baselines ( id, is_current ) )"
    )
    .eq("id", siteId)
    .maybeSingle();

  if (!site) notFound();

  const activePages = site.monitored_pages.filter((p) => p.is_active);
  const hasBaseline = activePages.some((p) =>
    p.baselines.some((b) => b.is_current)
  );

  return (
    <main className="flex flex-col gap-5">
      <SiteHeader site={site} hasBaseline={hasBaseline} />

      {!hasBaseline && <BaselineStatusCard siteId={site.id} />}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-on-surface-secondary">
          Monitored pages ({activePages.length})
        </h2>
        {activePages.length === 0 ? (
          <Card className="py-8 text-center text-sm text-on-surface-secondary">
            No pages selected yet — use &quot;Edit pages&quot; to choose what we
            watch.
          </Card>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-border">
              {activePages.map((page) => {
                const path = new URL(page.url).pathname;
                return (
                  <li
                    key={page.id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {page.label || path}
                      </p>
                      <p className="truncate font-mono text-xs text-on-surface-secondary">
                        {path}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {page.importance === "critical" && (
                        <span className="rounded-full bg-severity-critical-subtle px-2 py-0.5 text-xs font-medium text-severity-critical">
                          ● Critical
                        </span>
                      )}
                      <Chip>{page.page_type}</Chip>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </main>
  );
}
