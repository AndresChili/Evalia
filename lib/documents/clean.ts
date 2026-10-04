/**
 * Normalización básica del texto extraído: colapsa espacios/saltos de línea redundantes.
 * No intenta detectar y eliminar headers/footers repetidos (limitación conocida, documentada
 * en el README) — queda como posible mejora futura si se observa que degrada la calidad.
 */
export function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}
