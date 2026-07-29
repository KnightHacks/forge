import { normalizeSearchValue, scoreSearchCandidate } from "../search-ranking";

export interface AdminMemberSearchCandidate {
  company: string | null;
  discordUser: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  school: string;
}

export function rankAdminMemberCandidates<
  Candidate extends AdminMemberSearchCandidate,
>(candidates: readonly Candidate[], query: string) {
  if (!normalizeSearchValue(query)) {
    return candidates.map((candidate) => ({ candidate, score: 0 }));
  }

  const ranked = candidates.flatMap((candidate) => {
    const score = scoreSearchCandidate(
      [
        candidate.firstName,
        candidate.lastName,
        `${candidate.firstName} ${candidate.lastName}`,
        candidate.email,
        candidate.discordUser,
        candidate.company ?? "",
        candidate.school,
      ].join(" "),
      query,
    );
    return score === null ? [] : [{ candidate, score }];
  });

  return ranked.sort(
    (left, right) =>
      right.score - left.score ||
      left.candidate.id.localeCompare(right.candidate.id),
  );
}
