import { z } from "zod";

/**
 * Shape of a waitlist application.
 *
 * Trimming and lower-casing happen here, before validation, so the store only
 * ever sees normalised values and case-different emails collide as duplicates.
 */
export const waitlistInputSchema = z.object({
  handle: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(2, "A handle needs at least two characters.")
        .max(32, "A handle cannot exceed 32 characters."),
    ),
  email: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(
      z
        .email("Enter an email address we can reach you at.")
        .max(254, "That email address is too long to be real."),
    ),
});

export type WaitlistInput = z.infer<typeof waitlistInputSchema>;
