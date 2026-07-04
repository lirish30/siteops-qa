import { z } from "zod";

export const PAGE_TYPES = [
  "home",
  "contact",
  "landing",
  "service",
  "about",
  "other",
] as const;

export const monitoredPageSchema = z.object({
  url: z.string().trim().url("Page URLs must be full URLs.").max(2000),
  label: z.string().trim().max(120).optional(),
  pageType: z.enum(PAGE_TYPES).optional(),
  importance: z.enum(["critical", "normal"]).optional(),
});

export const putPagesSchema = z.object({
  pages: z
    .array(monitoredPageSchema)
    .min(1, "Select at least one page to monitor.")
    .max(500),
});

export type MonitoredPageInput = z.infer<typeof monitoredPageSchema>;
export type PutPagesInput = z.infer<typeof putPagesSchema>;

// Ignored regions (TASK-033): rectangles in natural-image pixel coordinates,
// zeroed out during visual diff (Phase 3).
export const ignoredRegionSchema = z.object({
  x: z.number().int().min(0).max(20000),
  y: z.number().int().min(0).max(60000),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(60000),
  viewport: z.enum(["desktop", "mobile"]),
});

export const patchPageSchema = z.object({
  ignoredRegions: z.array(ignoredRegionSchema).max(50),
});

export type IgnoredRegion = z.infer<typeof ignoredRegionSchema>;
export type PatchPageInput = z.infer<typeof patchPageSchema>;
