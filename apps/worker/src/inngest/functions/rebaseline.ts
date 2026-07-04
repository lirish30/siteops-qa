import * as Sentry from "@sentry/node";
import type { Json } from "@siteops/shared/database.types";
import { inngest } from "../client";
import { supabase } from "../../lib/supabase";

interface MetadataSnapshot {
  pageTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonicalUrl: string | null;
  htmlHash: string | null;
}

function metadata(value: Json): MetadataSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      pageTitle: null,
      metaDescription: null,
      h1: null,
      canonicalUrl: null,
      htmlHash: null,
    };
  }
  const record = value as Record<string, unknown>;
  return {
    pageTitle: stringOrNull(record.pageTitle),
    metaDescription: stringOrNull(record.metaDescription),
    h1: stringOrNull(record.h1),
    canonicalUrl: stringOrNull(record.canonicalUrl),
    htmlHash: stringOrNull(record.htmlHash),
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export const rebaselineFromScan = inngest.createFunction(
  {
    id: "rebaseline-from-scan",
    concurrency: [{ key: "event.data.siteId", limit: 1 }],
    retries: 1,
    onFailure: async ({ event }) => {
      const scanId = event.data.event.data.scanId as string;
      Sentry.captureMessage(`rebaseline failed for scan ${scanId}`, "error");
    },
  },
  { event: "app/scan.rebaseline" },
  async ({ event, step }) => {
    const { scanId, siteId } = event.data as { scanId: string; siteId: string };

    const results = await step.run("load-successful-results", async () => {
      const { data, error } = await supabase
        .from("page_scan_results")
        .select(
          "id, page_id, http_status, desktop_screenshot_path, mobile_screenshot_path, metadata_snapshot, console_errors, broken_links, forms, ctas"
        )
        .eq("scan_id", scanId)
        .eq("status", "complete")
        .not("desktop_screenshot_path", "is", null)
        .not("mobile_screenshot_path", "is", null);
      if (error) throw new Error(`load results failed: ${error.message}`);
      return data ?? [];
    });

    let copied = 0;
    for (const result of results) {
      await step.run(`copy-page-${result.page_id}`, async () => {
        const meta = metadata(result.metadata_snapshot);
        const { data: baseline, error } = await supabase
          .from("baselines")
          .insert({
            site_id: siteId,
            page_id: result.page_id,
            scan_id: scanId,
            is_current: false,
            status: "complete",
            desktop_screenshot_path: result.desktop_screenshot_path,
            mobile_screenshot_path: result.mobile_screenshot_path,
            http_status: result.http_status,
            page_title: meta.pageTitle,
            meta_description: meta.metaDescription,
            h1: meta.h1,
            canonical_url: meta.canonicalUrl,
            html_hash: meta.htmlHash,
            console_errors: result.console_errors,
            broken_links: result.broken_links,
            forms: result.forms,
            ctas: result.ctas,
          })
          .select("id")
          .single();
        if (error || !baseline) {
          throw new Error(`baseline copy failed: ${error?.message}`);
        }
        const { error: rpcError } = await supabase.rpc("set_current_baseline", {
          p_page_id: result.page_id,
          p_baseline_id: baseline.id,
        });
        if (rpcError) throw new Error(`set_current_baseline failed: ${rpcError.message}`);
        copied += 1;
      });
    }

    return { copied };
  }
);
