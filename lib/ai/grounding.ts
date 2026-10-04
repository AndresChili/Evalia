function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/[^\w\s]/g, " ") // quita puntuación
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Comprueba que la cita que la IA dice haber extraído del documento aparece de verdad en el
 * fragmento origen. Primera línea de defensa contra alucinación: si la IA no puede citar el
 * texto real, la pregunta se descarta sin gastar una llamada extra al validador.
 *
 * No exige coincidencia exacta carácter a carácter (la IA normaliza espacios/mayúsculas a
 * veces) pero sí exige que la cita sea sustancialmente el mismo texto, no una paráfrasis.
 */
export function isGrounded(sourceQuote: string, chunkContent: string): boolean {
  const normalizedQuote = normalize(sourceQuote);
  const normalizedChunk = normalize(chunkContent);

  if (normalizedQuote.length < 5) return false;

  if (normalizedChunk.includes(normalizedQuote)) return true;

  // Fallback: exige que la gran mayoría de las palabras de la cita aparezcan, en el mismo
  // orden aproximado, dentro del fragmento (tolera pequeñas variaciones de la IA).
  const quoteWords = normalizedQuote.split(" ").filter((w) => w.length > 2);
  if (quoteWords.length === 0) return false;

  const chunkWords = new Set(normalizedChunk.split(" "));
  const matched = quoteWords.filter((w) => chunkWords.has(w)).length;
  return matched / quoteWords.length >= 0.85;
}
