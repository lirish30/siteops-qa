// Sanitizes user-supplied return paths (?next=) so auth flows can never
// redirect off-site: must be a same-site absolute path, not protocol-relative.
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}
