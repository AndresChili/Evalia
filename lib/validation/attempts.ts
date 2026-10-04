import { z } from "zod";

export const startAttemptSchema = z.object({
  testId: z.string().min(1),
  mode: z.enum(["STUDY", "EXAM"]),
});

export const submitAnswerSchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  selectedOptionId: z.string().min(1).nullable(),
});

export const finishAttemptSchema = z.object({
  attemptId: z.string().min(1),
});
