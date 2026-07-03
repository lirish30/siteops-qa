import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/badge";

export function SiteHeader({
  site,
  hasBaseline,
}: {
  site: { id: string; name: string; url: string; wp_detection: string };
  hasBaseline: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {site.name}
          </h1>
          {site.wp_detection === "detected" && <Chip>WordPress</Chip>}
          {site.wp_detection === "not_detected" && <Chip>Not WordPress</Chip>}
        </div>
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-on-surface-secondary hover:underline"
        >
          {site.url}
        </a>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/sites/${site.id}/pages`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Edit pages
        </Link>
        <Button
          disabled={!hasBaseline}
          title={hasBaseline ? undefined : "Create a baseline first"}
        >
          Run scan
        </Button>
      </div>
    </div>
  );
}
