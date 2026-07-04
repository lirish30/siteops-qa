import { Chip, SeverityBadge } from "@/components/ui/badge";
import type { Severity } from "@siteops/shared";

export function SeverityChips({
  counts,
  order,
}: {
  counts: Record<Severity, number>;
  order: readonly Severity[];
}) {
  const total = order.reduce((sum, severity) => sum + counts[severity], 0);

  return (
    <div className="flex flex-wrap gap-2" aria-label="Open issue counts">
      <Chip>{total} open finding{total === 1 ? "" : "s"}</Chip>
      {order.map((severity) => (
        <SeverityBadge
          key={severity}
          severity={severity}
          label={`${counts[severity]} ${severity}`}
          className={counts[severity] === 0 ? "opacity-60" : undefined}
        />
      ))}
    </div>
  );
}
