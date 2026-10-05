import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFriendsForShare } from "@/lib/friends";
import { ResultsView } from "@/components/attempts/results-view";
import { TestTakingView } from "@/components/attempts/test-taking-view";

export const metadata: Metadata = { title: "Realizar test" };

type Props = { params: Promise<{ id: string }> };

export default async function AttemptPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const attempt = await db.testAttempt.findUnique({
    where: { id },
    include: {
      answers: true,
      test: {
        include: {
          questions: { include: { options: true }, orderBy: { orderIndex: "asc" } },
          savedBy: { where: { userId: session.user.id } },
        },
      },
    },
  });

  if (!attempt || attempt.userId !== session.user.id) notFound();

  const answeredMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

  if (attempt.status === "COMPLETED") {
    const questions = attempt.test.questions.map((q) => {
      const answer = answeredMap.get(q.id);
      const status: "correct" | "incorrect" | "unanswered" = !answer?.selectedOptionId
        ? "unanswered"
        : answer.isCorrect
          ? "correct"
          : "incorrect";
      return {
        id: q.id,
        prompt: q.prompt,
        explanation: q.explanation,
        options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        selectedOptionId: answer?.selectedOptionId ?? null,
        status,
      };
    });

    const friends = await getFriendsForShare(session.user.id);

    return (
      <ResultsView
        testId={attempt.test.id}
        testTitle={attempt.test.title}
        initialSaved={attempt.test.savedBy.length > 0}
        friends={friends}
        correctCount={attempt.correctCount}
        incorrectCount={attempt.incorrectCount}
        unansweredCount={attempt.unansweredCount}
        totalQuestions={attempt.test.questions.length}
        rawScore={Number(attempt.rawScore)}
        penaltyApplied={Number(attempt.penaltyApplied)}
        finalScore={Number(attempt.finalScore)}
        questions={questions}
      />
    );
  }

  // IN_PROGRESS: nunca se envía al cliente qué opción es correcta, salvo para preguntas que el
  // propio usuario ya contestó en modo estudio (feedback que ya vio al responder).
  const clientQuestions = attempt.test.questions.map((q) => {
    const answer = answeredMap.get(q.id);
    const alreadyRevealed = attempt.mode === "STUDY" && !!answer?.selectedOptionId;

    return {
      id: q.id,
      prompt: q.prompt,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      selectedOptionId: answer?.selectedOptionId ?? null,
      revealed: alreadyRevealed
        ? {
            correctOptionId: q.options.find((o) => o.isCorrect)!.id,
            isCorrect: answer!.isCorrect ?? false,
            explanation: q.explanation,
          }
        : null,
    };
  });

  return (
    <TestTakingView attemptId={attempt.id} mode={attempt.mode} initialQuestions={clientQuestions} />
  );
}
