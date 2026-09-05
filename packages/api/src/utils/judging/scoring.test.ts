import { describe, expect, it } from "vitest";

import {
  aggregateEvaluationMeans,
  canReadScopedResult,
  evaluationMean,
  resolveResponseVisibility,
} from "./scoring";

describe("judging score math", () => {
  it("averages every answer in one evaluation", () => {
    expect(evaluationMean([5, 3, 4, 2])).toBe(3.5);
    expect(evaluationMean([])).toBeNull();
  });

  it("weights completed evaluations equally", () => {
    expect(
      aggregateEvaluationMeans([
        [5, 5],
        [1, 3],
        [4, 2],
      ]),
    ).toEqual({
      count: 3,
      value: 10 / 3,
    });
  });

  it("does not give each challenge a separate weight", () => {
    expect(aggregateEvaluationMeans([[5], [3], [1]])).toEqual({
      count: 3,
      value: 3,
    });
  });
});

describe("judging result visibility", () => {
  it("reveals scoped scores after the judge submits", () => {
    expect(
      canReadScopedResult({
        displayAllResultsToMembers: false,
        hasOwnEvaluation: true,
        principalKind: "guest",
      }),
    ).toBe(true);
  });

  it("applies the officer reveal to members but never guests", () => {
    expect(
      canReadScopedResult({
        displayAllResultsToMembers: true,
        hasOwnEvaluation: false,
        principalKind: "member",
      }),
    ).toBe(true);
    expect(
      canReadScopedResult({
        displayAllResultsToMembers: true,
        hasOwnEvaluation: false,
        principalKind: "guest",
      }),
    ).toBe(false);
  });
});

describe("judging response visibility", () => {
  it("derives fixed policies and defaults optional sharing to private", () => {
    expect(resolveResponseVisibility("public", false)).toBe(true);
    expect(resolveResponseVisibility("private", true)).toBe(false);
    expect(resolveResponseVisibility("public_optional")).toBe(false);
    expect(resolveResponseVisibility("public_optional", true)).toBe(true);
  });
});
