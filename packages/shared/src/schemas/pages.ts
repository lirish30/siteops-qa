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
