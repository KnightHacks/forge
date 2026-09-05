export function mean(values: readonly number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function evaluationMean(values: readonly number[]) {
  return mean(values);
}

export function aggregateEvaluationMeans(
  evaluations: readonly (readonly number[])[],
) {
  const evaluationMeans = evaluations
    .map(evaluationMean)
    .filter((value): value is number => value !== null);
  return {
    count: evaluationMeans.length,
    value: mean(evaluationMeans),
  };
}

export function canReadScopedResult(input: {
  displayAllResultsToMembers: boolean;
  hasOwnEvaluation: boolean;
  principalKind: "guest" | "member";
}) {
  return (
    input.hasOwnEvaluation ||
    (input.principalKind === "member" && input.displayAllResultsToMembers)
  );
}

export function resolveResponseVisibility(
  policy: "private" | "public" | "public_optional",
  requested?: boolean,
) {
  if (policy === "public") return true;
  if (policy === "private") return false;
  return requested === true;
}
