import { z } from "zod";

export const createSiteSchema = z.object({
  url: z.string().trim().min(1, "Enter your site's URL.").max(2000),
  name: z.string().trim().min(1).max(120).optional(),
});

export const updateSiteSchema = z
  .object({
    name: z.string().trim().min(1, "Give the site a name.").max(120).optional(),
    status: z.enum(["active", "archived"]).optional(),
  })
  .refine((v) => v.name !== undefined || v.status !== undefined, {
    message: "Nothing to update",
  });

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
