import { describe, expect, it } from "vitest";

import { isDuplicate } from "@/lib/ai/dedupe";
import { isGrounded } from "@/lib/ai/grounding";
import { shuffle } from "@/lib/ai/shuffle";
import { hasValidShape } from "@/lib/ai/validate-question";
import type { QuestionCandidate } from "@/lib/ai/schemas";

const CHUNK = `La fotosíntesis es el proceso por el cual las plantas convierten la luz solar
en energía química. Ocurre principalmente en los cloroplastos, gracias a la clorofila.`;

describe("isGrounded", () => {
  it("accepts an exact substring of the chunk", () => {
    expect(isGrounded("la luz solar en energía química", CHUNK)).toBe(true);
  });

  it("accepts near-exact quotes despite minor casing/whitespace differences", () => {
    expect(isGrounded("La Luz Solar en energia quimica", CHUNK)).toBe(true);
  });

  it("rejects a quote that is not actually in the chunk (hallucinated citation)", () => {
    expect(isGrounded("los animales respiran oxígeno para vivir", CHUNK)).toBe(false);
  });

  it("rejects a quote that is too short to be meaningful", () => {
    expect(isGrounded("la", CHUNK)).toBe(false);
  });

  it("rejects an empty quote", () => {
    expect(isGrounded("", CHUNK)).toBe(false);
  });
});

describe("isDuplicate", () => {
  const existing = ["¿Dónde ocurre principalmente la fotosíntesis?"];

  it("flags a near-identical question as duplicate", () => {
    expect(isDuplicate("¿Dónde ocurre la fotosíntesis principalmente?", existing)).toBe(true);
  });

  it("does not flag a genuinely different question", () => {
    expect(isDuplicate("¿Qué pigmento es necesario para la fotosíntesis?", existing)).toBe(false);
  });

  it("returns false against an empty list", () => {
    expect(isDuplicate("Cualquier pregunta", [])).toBe(false);
  });
});

describe("hasValidShape", () => {
  const baseMC: QuestionCandidate = {
    prompt: "¿Dónde ocurre la fotosíntesis?",
    sourceQuote: "Ocurre principalmente en los cloroplastos",
    explanation: "El texto lo dice explícitamente.",
    options: [
      { text: "En los cloroplastos", isCorrect: true },
      { text: "En las mitocondrias", isCorrect: false },
      { text: "En el núcleo", isCorrect: false },
      { text: "En el citoplasma", isCorrect: false },
    ],
  };

  it("accepts a well-formed multiple-choice candidate", () => {
    expect(hasValidShape(baseMC, "MULTIPLE_CHOICE", 4)).toBe(true);
  });

  it("rejects when no option is marked correct", () => {
    const candidate = {
      ...baseMC,
      options: baseMC.options.map((o) => ({ ...o, isCorrect: false })),
    };
    expect(hasValidShape(candidate, "MULTIPLE_CHOICE", 4)).toBe(false);
  });

  it("rejects when more than one option is marked correct", () => {
    const options = baseMC.options.map((o, i) => ({ ...o, isCorrect: i < 2 }));
    expect(hasValidShape({ ...baseMC, options }, "MULTIPLE_CHOICE", 4)).toBe(false);
  });

  it("rejects when the option count doesn't match the requested count", () => {
    expect(hasValidShape(baseMC, "MULTIPLE_CHOICE", 5)).toBe(false);
  });

  it("rejects duplicate option text", () => {
    const options = [
      { text: "En los cloroplastos", isCorrect: true },
      { text: "En los cloroplastos", isCorrect: false },
      { text: "En el núcleo", isCorrect: false },
      { text: "En el citoplasma", isCorrect: false },
    ];
    expect(hasValidShape({ ...baseMC, options }, "MULTIPLE_CHOICE", 4)).toBe(false);
  });

  it("accepts a well-formed true/false candidate", () => {
    const tf: QuestionCandidate = {
      ...baseMC,
      options: [
        { text: "Verdadero", isCorrect: true },
        { text: "Falso", isCorrect: false },
      ],
    };
    expect(hasValidShape(tf, "TRUE_FALSE", null)).toBe(true);
  });

  it("rejects a true/false candidate without both Verdadero and Falso options", () => {
    const tf: QuestionCandidate = {
      ...baseMC,
      options: [
        { text: "Sí", isCorrect: true },
        { text: "No", isCorrect: false },
      ],
    };
    expect(hasValidShape(tf, "TRUE_FALSE", null)).toBe(false);
  });
});

describe("shuffle", () => {
  it("preserves all elements (same multiset, different or same order)", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result.sort()).toEqual(input.sort());
  });

  it("does not mutate the original array", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });
});
