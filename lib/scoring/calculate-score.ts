import Decimal from "decimal.js";

import type { ScoringType } from "@/lib/generated/prisma/enums";

export type ScoringInput = {
  correctCount: number;
  incorrectCount: number;
  scoringType: ScoringType;
  /** Puntos que resta cada fallo (0–1). Solo para CUSTOM_PENALTY. */
  penaltyValue?: Decimal.Value | null;
  /** Cada cuántos fallos se resta 1 punto. Solo para GROUPED_PENALTY. */
  penaltyGroupSize?: number | null;
};

export type ScoringResult = {
  rawScore: Decimal;
  penaltyApplied: Decimal;
  finalScore: Decimal;
};

/**
 * Calcula la puntuación final de un intento. Usa decimal.js en vez de floats nativos de JS
 * para evitar errores de precisión (0.1 + 0.2 !== 0.3) acumulados al multiplicar/restar
 * penalizaciones decimales sobre muchas preguntas.
 *
 * La puntuación final nunca baja de 0 — una nota negativa no tiene sentido pedagógico aunque
 * la resta aritmética diera un número negativo (decisión de producto, no estaba especificado).
 */
export function calculateScore(input: ScoringInput): ScoringResult {
  const rawScore = new Decimal(input.correctCount);

  let penaltyApplied = new Decimal(0);
  if (input.scoringType === "CUSTOM_PENALTY" && input.penaltyValue != null) {
    penaltyApplied = new Decimal(input.penaltyValue).times(input.incorrectCount);
  } else if (input.scoringType === "GROUPED_PENALTY" && input.penaltyGroupSize) {
    const fullGroups = Math.floor(input.incorrectCount / input.penaltyGroupSize);
    penaltyApplied = new Decimal(fullGroups);
  }

  const finalScoreRaw = rawScore.minus(penaltyApplied);
  const finalScore = finalScoreRaw.isNegative() ? new Decimal(0) : finalScoreRaw;

  return { rawScore, penaltyApplied, finalScore };
}
