function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.6;

/**
 * Deduplicación por solape de palabras (Jaccard) sobre el enunciado, no por embeddings:
 * evita una llamada de IA extra por pregunta (coste/cuota) y es suficiente para detectar
 * preguntas casi-idénticas generadas por error desde el mismo fragmento o fragmentos solapados.
 * No detecta paráfrasis sofisticadas — limitación conocida, documentada en el README.
 */
export function isDuplicate(prompt: string, existingPrompts: string[]): boolean {
  const candidateWords = wordSet(prompt);
  return existingPrompts.some(
    (existing) => jaccardSimilarity(candidateWords, wordSet(existing)) >= SIMILARITY_THRESHOLD,
  );
}
