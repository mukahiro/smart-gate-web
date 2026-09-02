import { z } from "zod";

export const loginInputSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});
