export interface AdminMemberSearchCandidate {
  company: string | null;
  discordUser: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  school: string;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editDistance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );

  for (let index = 0; index <= left.length; index += 1) {
    const row = rows[index];
    if (row) row[0] = index;
  }
  const firstRow = rows[0];
  if (firstRow) {
    for (let index = 0; index <= right.length; index += 1) {
      firstRow[index] = index;
    }
  }

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const row = rows[leftIndex];
      const priorRow = rows[leftIndex - 1];
      if (!row || !priorRow) continue;
      row[rightIndex] = Math.min(
        (priorRow[rightIndex] ?? 0) + 1,
        (row[rightIndex - 1] ?? 0) + 1,
        (priorRow[rightIndex - 1] ?? 0) + cost,
      );
    }
  }

  return rows[left.length]?.[right.length] ?? Number.POSITIVE_INFINITY;
}

function tokenScore(token: string, searchable: string, words: string[]) {
  if (searchable === token) return 1_000;
  if (words.includes(token)) return 950;
  if (searchable.startsWith(token)) return 900;
  if (words.some((word) => word.startsWith(token))) return 850;
  if (searchable.includes(token)) return 800;

  const allowedDistance = token.length <= 4 ? 1 : 2;
  const closestDistance = Math.min(
    ...words.map((word) => editDistance(token, word)),
  );
  if (closestDistance <= allowedDistance) return 600 - closestDistance * 50;

  return null;
}

export function rankAdminMemberCandidates<
  Candidate extends AdminMemberSearchCandidate,
>(candidates: readonly Candidate[], query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return candidates.map((candidate) => ({ candidate, score: 0 }));
  }

  const queryTokens = normalizedQuery.split(" ");
  const ranked = candidates.flatMap((candidate) => {
    const searchable = normalizeSearchValue(
      [
        candidate.firstName,
        candidate.lastName,
        `${candidate.firstName} ${candidate.lastName}`,
        candidate.email,
        candidate.discordUser,
        candidate.company ?? "",
        candidate.school,
      ].join(" "),
    );
    const words = searchable.split(" ");
    const scores = queryTokens.map((token) =>
      tokenScore(token, searchable, words),
    );
    if (scores.some((score) => score === null)) return [];
    const numericScores = scores.filter(
      (score): score is number => score !== null,
    );

    return [
      {
        candidate,
        score: numericScores.reduce((total, score) => total + score, 0),
      },
    ];
  });

  return ranked.sort(
    (left, right) =>
      right.score - left.score ||
      left.candidate.id.localeCompare(right.candidate.id),
  );
}

export function escapeCsvCell(
  value: Date | number | string | null | undefined,
) {
  let text =
    value == null
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
