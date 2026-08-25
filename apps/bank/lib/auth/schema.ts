import { z } from "zod";

/** A handle is how a member is known: letters, digits, and the odd separator. */
export const handleSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(2, "A handle needs at least two characters.")
      .max(32, "A handle cannot exceed 32 characters.")
      .regex(/^[a-zA-Z0-9._-]+$/, "A handle uses letters, digits, and . _ - only."),
  );

export const emailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email("Enter an email address.").max(254, "That email address is too long to be real."));

/**
 * Twelve characters, and no composition rules.
 *
 * Length is the only requirement that reliably buys entropy; demanding a digit
 * and a symbol mostly buys `Password1!`.
 */
export const passwordSchema = z
  .string()
  .min(12, "A password needs at least twelve characters.")
  .max(200, "A password cannot exceed 200 characters.");

export const signInSchema = z.object({
  handle: z.string().transform((value) => value.trim()),
  password: z.string(),
});

/** What someone is called. Not unique — two people may share a name. */
export const displayNameSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(2, "Enter the name you go by.")
      .max(60, "A name cannot exceed 60 characters."),
  );
