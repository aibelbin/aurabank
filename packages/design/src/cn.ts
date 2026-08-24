/** Joins class names, dropping falsy values. Keeps a dependency out of the tree. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
