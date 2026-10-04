export type TallyAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
};

export type TallyResult = {
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
};

/**
 * Cuenta correctas/incorrectas/sin-contestar recorriendo TODAS las preguntas del test, no solo
 * las que tienen UserAnswer — una pregunta sin fila de respuesta (nunca se tocó) cuenta como
 * sin contestar, igual que una con selectedOptionId=null.
 */
export function tallyAttempt(questionIds: string[], answers: TallyAnswer[]): TallyResult {
  const answeredMap = new Map(answers.map((a) => [a.questionId, a]));

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  for (const questionId of questionIds) {
    const answer = answeredMap.get(questionId);
    if (!answer || !answer.selectedOptionId) {
      unansweredCount += 1;
    } else if (answer.isCorrect) {
      correctCount += 1;
    } else {
      incorrectCount += 1;
    }
  }

  return { correctCount, incorrectCount, unansweredCount };
}
