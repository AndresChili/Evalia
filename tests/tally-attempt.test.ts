import { describe, expect, it } from "vitest";

import { tallyAttempt } from "@/lib/scoring/tally-attempt";

describe("tallyAttempt", () => {
  it("counts correct, incorrect and unanswered from a mixed set of answers", () => {
    const result = tallyAttempt(
      ["q1", "q2", "q3", "q4", "q5"],
      [
        { questionId: "q1", selectedOptionId: "a", isCorrect: true },
        { questionId: "q2", selectedOptionId: "b", isCorrect: false },
        { questionId: "q3", selectedOptionId: "c", isCorrect: true },
      ],
    );
    expect(result).toEqual({ correctCount: 2, incorrectCount: 1, unansweredCount: 2 });
  });

  it("treats a question with no UserAnswer row at all as unanswered", () => {
    const result = tallyAttempt(["q1", "q2"], []);
    expect(result.unansweredCount).toBe(2);
  });

  it("treats a UserAnswer row with selectedOptionId=null as unanswered (not incorrect)", () => {
    const result = tallyAttempt(
      ["q1"],
      [{ questionId: "q1", selectedOptionId: null, isCorrect: null }],
    );
    expect(result).toEqual({ correctCount: 0, incorrectCount: 0, unansweredCount: 1 });
  });

  it("all correct", () => {
    const result = tallyAttempt(
      ["q1", "q2"],
      [
        { questionId: "q1", selectedOptionId: "a", isCorrect: true },
        { questionId: "q2", selectedOptionId: "a", isCorrect: true },
      ],
    );
    expect(result).toEqual({ correctCount: 2, incorrectCount: 0, unansweredCount: 0 });
  });

  it("empty test (no questions) tallies to all zeros", () => {
    expect(tallyAttempt([], [])).toEqual({
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
    });
  });
});
