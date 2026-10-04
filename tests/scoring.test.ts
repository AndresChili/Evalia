import { describe, expect, it } from "vitest";

import { calculateScore } from "@/lib/scoring/calculate-score";

describe("calculateScore — NO_PENALTY", () => {
  it("10 preguntas, 7 correctas, 2 incorrectas, 1 sin contestar → 7 puntos", () => {
    const result = calculateScore({
      correctCount: 7,
      incorrectCount: 2,
      scoringType: "NO_PENALTY",
    });
    expect(result.finalScore.toNumber()).toBe(7);
    expect(result.penaltyApplied.toNumber()).toBe(0);
  });

  it("los fallos nunca restan, aunque haya muchos", () => {
    const result = calculateScore({
      correctCount: 3,
      incorrectCount: 7,
      scoringType: "NO_PENALTY",
    });
    expect(result.finalScore.toNumber()).toBe(3);
  });
});

describe("calculateScore — CUSTOM_PENALTY", () => {
  it("ejemplo del enunciado: 7 correctas, 3 incorrectas, penalización 0.33 → 6.01", () => {
    const result = calculateScore({
      correctCount: 7,
      incorrectCount: 3,
      scoringType: "CUSTOM_PENALTY",
      penaltyValue: 0.33,
    });
    expect(result.finalScore.toNumber()).toBe(6.01);
  });

  it("penalización 0.25 por fallo, 4 fallos → resta exactamente 1 (sin errores de float)", () => {
    const result = calculateScore({
      correctCount: 6,
      incorrectCount: 4,
      scoringType: "CUSTOM_PENALTY",
      penaltyValue: 0.25,
    });
    // En JS nativo 0.25 * 4 puede arrastrar imprecisión en cadenas de cálculo más largas;
    // decimal.js debe dar exactamente 1.
    expect(result.penaltyApplied.toNumber()).toBe(1);
    expect(result.finalScore.toNumber()).toBe(5);
  });

  it("penalización 1.00 (resta el punto completo por cada fallo)", () => {
    const result = calculateScore({
      correctCount: 5,
      incorrectCount: 5,
      scoringType: "CUSTOM_PENALTY",
      penaltyValue: 1,
    });
    expect(result.finalScore.toNumber()).toBe(0);
  });

  it("la puntuación final nunca es negativa aunque la penalización supere los aciertos", () => {
    const result = calculateScore({
      correctCount: 2,
      incorrectCount: 8,
      scoringType: "CUSTOM_PENALTY",
      penaltyValue: 1,
    });
    expect(result.finalScore.toNumber()).toBe(0);
  });

  it("penalización con muchos decimales no acumula error de precisión (0.33 × 7)", () => {
    const result = calculateScore({
      correctCount: 10,
      incorrectCount: 7,
      scoringType: "CUSTOM_PENALTY",
      penaltyValue: 0.33,
    });
    // 0.33 * 7 = 2.31 exacto; en float nativo esto puede dar 2.3099999999999996
    expect(result.penaltyApplied.toNumber()).toBe(2.31);
  });
});

describe("calculateScore — GROUPED_PENALTY ('cada X fallos resta 1 punto')", () => {
  it("cada 3 fallos resta 1 punto: 7 fallos → 2 grupos completos → -2 (el 7º fallo no penaliza)", () => {
    const result = calculateScore({
      correctCount: 3,
      incorrectCount: 7,
      scoringType: "GROUPED_PENALTY",
      penaltyGroupSize: 3,
    });
    expect(result.penaltyApplied.toNumber()).toBe(2);
    expect(result.finalScore.toNumber()).toBe(1);
  });

  it("cada 5 fallos resta 1 punto: 4 fallos → no penaliza", () => {
    const result = calculateScore({
      correctCount: 6,
      incorrectCount: 4,
      scoringType: "GROUPED_PENALTY",
      penaltyGroupSize: 5,
    });
    expect(result.penaltyApplied.toNumber()).toBe(0);
    expect(result.finalScore.toNumber()).toBe(6);
  });

  it("cada 5 fallos resta 1 punto: 5 fallos → penaliza 1", () => {
    const result = calculateScore({
      correctCount: 5,
      incorrectCount: 5,
      scoringType: "GROUPED_PENALTY",
      penaltyGroupSize: 5,
    });
    expect(result.penaltyApplied.toNumber()).toBe(1);
  });

  it("cada 5 fallos resta 1 punto: 9 fallos → sigue siendo solo 1 (no llega al 2º grupo)", () => {
    const result = calculateScore({
      correctCount: 1,
      incorrectCount: 9,
      scoringType: "GROUPED_PENALTY",
      penaltyGroupSize: 5,
    });
    expect(result.penaltyApplied.toNumber()).toBe(1);
  });

  it("cada 5 fallos resta 1 punto: 10 fallos → 2 grupos completos → penaliza 2", () => {
    const result = calculateScore({
      correctCount: 0,
      incorrectCount: 10,
      scoringType: "GROUPED_PENALTY",
      penaltyGroupSize: 5,
    });
    expect(result.penaltyApplied.toNumber()).toBe(2);
  });

  it("0 fallos nunca penaliza", () => {
    const result = calculateScore({
      correctCount: 10,
      incorrectCount: 0,
      scoringType: "GROUPED_PENALTY",
      penaltyGroupSize: 3,
    });
    expect(result.penaltyApplied.toNumber()).toBe(0);
    expect(result.finalScore.toNumber()).toBe(10);
  });
});

describe("calculateScore — casos límite", () => {
  it("0 correctas, 0 incorrectas (test sin contestar nada) → 0 puntos, sin penalización", () => {
    const result = calculateScore({
      correctCount: 0,
      incorrectCount: 0,
      scoringType: "NO_PENALTY",
    });
    expect(result.finalScore.toNumber()).toBe(0);
  });

  it("CUSTOM_PENALTY sin penaltyValue definido no penaliza (config inconsistente, falla seguro)", () => {
    const result = calculateScore({
      correctCount: 5,
      incorrectCount: 5,
      scoringType: "CUSTOM_PENALTY",
    });
    expect(result.penaltyApplied.toNumber()).toBe(0);
  });

  it("GROUPED_PENALTY sin penaltyGroupSize definido no penaliza (config inconsistente, falla seguro)", () => {
    const result = calculateScore({
      correctCount: 5,
      incorrectCount: 5,
      scoringType: "GROUPED_PENALTY",
    });
    expect(result.penaltyApplied.toNumber()).toBe(0);
  });
});
