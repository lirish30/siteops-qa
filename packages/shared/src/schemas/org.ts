import { z } from "zod";

export const createOrgSchema = z.object({
  name: z.string().trim().min(1, "Give your organization a name.").max(120),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
