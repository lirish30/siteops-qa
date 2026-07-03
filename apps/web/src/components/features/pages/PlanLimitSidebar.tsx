"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function PlanLimitSidebar({
  selectedCount,
  pageLimit,
  saving,
  canSave,
  onSave,
}: {
  selectedCount: number;
  pageLimit: number;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
}) {
  const over = selectedCount > pageLimit;
  return (
    <Card className="flex h-fit w-full flex-col gap-3 lg:w-64">
      <p className="text-sm font-semibold">
        {selectedCount} of {pageLimit} pages
      </p>
      <Progress value={Math.min(selectedCount, pageLimit)} max={pageLimit} />
      {over && (
        <p className="text-xs font-medium text-severity-critical">
          That&apos;s more pages than your plan allows.
        </p>
      )}
      <p className="text-xs text-on-surface-secondary">
        Pick the pages that matter most — homepage, contact, and your key
        landing pages.
      </p>
      <Button onClick={onSave} disabled={!canSave || saving}>
        {saving ? "Saving…" : "Save selection"}
      </Button>
    </Card>
  );
}
