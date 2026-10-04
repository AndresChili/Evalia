import { z } from "zod";

export const MAX_QUESTION_COUNT = 50;

export const createTestConfigSchema = z
  .object({
    documentId: z.string().min(1),
    title: z.string().trim().min(2).max(100),
    questionType: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE"]),
    optionsCount: z.number().int().min(2).max(6).optional(),
    questionCount: z.number().int().min(1).max(MAX_QUESTION_COUNT),
    difficulty: z.enum(["LOW", "MEDIUM", "HIGH"]),
    scoringType: z.enum(["NO_PENALTY", "CUSTOM_PENALTY", "GROUPED_PENALTY"]),
    penaltyValue: z.number().min(0).max(1).optional(),
    penaltyGroupSize: z.number().int().min(2).max(10).optional(),
  })
  .refine((data) => data.questionType !== "MULTIPLE_CHOICE" || data.optionsCount !== undefined, {
    message: "Indica el número de opciones para alternativa múltiple.",
    path: ["optionsCount"],
  })
  .refine((data) => data.scoringType !== "CUSTOM_PENALTY" || data.penaltyValue !== undefined, {
    message: "Indica la penalización por fallo.",
    path: ["penaltyValue"],
  })
  .refine((data) => data.scoringType !== "GROUPED_PENALTY" || data.penaltyGroupSize !== undefined, {
    message: "Indica cada cuántos fallos se resta un punto.",
    path: ["penaltyGroupSize"],
  });

export type CreateTestConfig = z.infer<typeof createTestConfigSchema>;
