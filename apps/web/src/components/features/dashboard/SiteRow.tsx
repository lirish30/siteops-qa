import Link from "next/link";
import { Chip, SeverityBadge, type BadgeSeverity } from "@/components/ui/badge";
import { RunScanButton } from "@/components/features/scans/RunScanModal";

const SEVERITIES: BadgeSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
  "pass",
];

export function SiteRow({
  site,
}: {
  site: {
    id: string;
    name: string;
    url: string;
    wp_detection: string;
    last_scan_at: string | null;
    lastScanSeverity: string | null;
  };
}) {
  const severity = SEVERITIES.includes(site.lastScanSeverity as BadgeSeverity)
    ? (site.lastScanSeverity as BadgeSeverity)
    : null;

  return (
    <li className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-sunken">
      <Link href={`/sites/${site.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{site.name}</p>
          {site.wp_detection === "detected" && <Chip>WordPress</Chip>}
        </div>
        <p className="truncate text-xs text-on-surface-secondary">
          {site.url}
        </p>
      </Link>
      <div className="flex shrink-0 items-center gap-3">
        {severity ? (
          <SeverityBadge severity={severity} />
        ) : (
          <span className="text-xs text-on-surface-muted">Never scanned</span>
        )}
        <RunScanButton siteId={site.id} variant="secondary" />
      </div>
    </li>
  );
}
