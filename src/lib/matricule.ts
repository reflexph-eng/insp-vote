export function normalizeMatricule(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function cleanMatricule(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function matriculeLookupCandidates(value: unknown): string[] {
  const cleaned = cleanMatricule(value);
  const normalized = normalizeMatricule(value);
  const candidates = new Set<string>();

  if (cleaned) candidates.add(cleaned);
  if (normalized) candidates.add(normalized);

  // Format officiel le plus courant du fichier : 425 060 X.
  const commonMatch = normalized.match(/^(\d{3})(\d{3})([A-Z])$/);
  if (commonMatch) {
    candidates.add(`${commonMatch[1]} ${commonMatch[2]} ${commonMatch[3]}`);
  }

  return [...candidates];
}
