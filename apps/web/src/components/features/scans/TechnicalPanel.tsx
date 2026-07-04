import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/badge";

interface PageSide {
  httpStatus: number | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonical: string | null;
  consoleErrors: Record<string, unknown>[];
  brokenLinks: Record<string, unknown>[];
  forms: Record<string, unknown>[];
  ctas: Record<string, unknown>[];
}

export interface TechnicalSnapshot {
  baseline: PageSide;
  current: PageSide;
  infoNotes: string[];
}

export function TechnicalPanel({ snapshot }: { snapshot: TechnicalSnapshot }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-semibold text-on-surface-secondary">
        Technical details
      </summary>
      <Card className="mt-3 flex flex-col gap-5">
        {snapshot.infoNotes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {snapshot.infoNotes.map((note, index) => (
              <Chip key={index}>{note}</Chip>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="text-on-surface-secondary">
              <tr>
                <th className="w-36 py-2 font-semibold">Field</th>
                <th className="py-2 font-semibold">Baseline</th>
                <th className="py-2 font-semibold">Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["HTTP status", statusText(snapshot.baseline.httpStatus), statusText(snapshot.current.httpStatus)],
                ["Title", snapshot.baseline.title, snapshot.current.title],
                ["H1", snapshot.baseline.h1, snapshot.current.h1],
                ["Meta description", snapshot.baseline.metaDescription, snapshot.current.metaDescription],
                ["Canonical", snapshot.baseline.canonical, snapshot.current.canonical],
              ].map(([label, before, after]) => (
                <tr key={label}>
                  <th className="py-2 pr-3 font-medium text-on-surface-secondary">{label}</th>
                  <td className="max-w-xs py-2 pr-3">{before || "-"}</td>
                  <td className="max-w-xs py-2">{after || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ListBlock
            title="Console errors"
            items={snapshot.current.consoleErrors}
            empty="No console errors recorded."
            render={(item) => String(item.text ?? "Console error")}
          />
          <ListBlock
            title="Broken links"
            items={snapshot.current.brokenLinks}
            empty="No broken links recorded."
            render={(item) =>
              `${String(item.href ?? "Link")} (${item.status ?? "no response"})`
            }
          />
          <ListBlock
            title="Forms"
            items={snapshot.current.forms}
            empty="No forms detected."
            render={(item) =>
              `${String(item.plugin ?? "form")} - ${String(item.fieldCount ?? "?")} fields - submit ${item.hasSubmit ? "yes" : "no"}`
            }
          />
          <ListBlock
            title="CTAs"
            items={snapshot.current.ctas}
            empty="No CTAs detected."
            render={(item) => String(item.text ?? "CTA")}
          />
        </div>
      </Card>
    </details>
  );
}

function ListBlock({
  title,
  items,
  empty,
  render,
}: {
  title: string;
  items: Record<string, unknown>[];
  empty: string;
  render: (item: Record<string, unknown>) => string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-on-surface-secondary">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-on-surface-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-xs">
          {items.slice(0, 8).map((item, index) => (
            <li key={index} className="rounded-md bg-surface-sunken p-2">
              {render(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusText(status: number | null): string {
  return status === null ? "-" : `HTTP ${status}`;
}
