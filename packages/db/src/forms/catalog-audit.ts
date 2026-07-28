import { FORMS } from "@forge/consts";

/**
 * Pure analysis behind `scripts/audit-catalog-values.ts`. It reads rows and
 * returns counts; it never touches the database and never returns a string it
 * did not either compute or read out of `@forge/consts`.
 *
 * Four `catalogValue` implementations once existed and one of them diverged.
 * Two survive and are byte-identical, so new writes agree. Whether rows written
 * earlier carry values the divergent version produced is a question only the
 * stored data can answer, which is what this inspects.
 */

/**
 * Mirrors `catalogValue` in `packages/api/src/routers/forms.ts` and
 * `packages/validators/src/forms-platform.ts`, which are byte-identical to each
 * other. `@forge/db` cannot import either without inverting the package graph,
 * so the audit keeps its own copy. If the canonical implementation changes,
 * change this one in the same commit or the audit silently starts lying.
 */
export function catalogValue(label: string) {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const CHOICE_QUESTION_TYPES = new Set([
  "checkboxes",
  "dropdown",
  "multiple_choice",
]);

export interface AuditFormRecord {
  formData: unknown;
  id: string;
  name: string;
}

export interface AuditResponseRecord {
  form: string;
  responseData: unknown;
  responseSnapshot: unknown;
}

export interface CatalogValueMismatch {
  catalogId: string;
  count: number;
  expected: string;
  label: string;
  stored: string;
}

export interface CatalogValueFormTally {
  /** Answers with a catalog label available to recompute from. */
  checked: number;
  formId: string;
  formName: string;
  mismatches: CatalogValueMismatch[];
  /**
   * Answer exists but is not a platform selection object — pre-platform rows
   * store the label itself, so there is no derived value to disagree with.
   */
  preplatform: number;
  responses: number;
  /** Definition has no preset-catalog choice question, so nothing here is in scope. */
  responsesOutOfScope: number;
  /** Stored label is absent, so there is nothing to recompute from. */
  unlabeled: number;
  /** Stored label is no longer in the catalog, so the catalog moved, not the slug rule. */
  unrecognized: number;
}

export interface CatalogValueAudit {
  forms: CatalogValueFormTally[];
  totals: {
    checked: number;
    mismatched: number;
    preplatform: number;
    responses: number;
    responsesOutOfScope: number;
    unlabeled: number;
    unrecognized: number;
  };
}

interface PresetQuestion {
  catalogId: string;
  questionId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Pulls preset-catalog choice questions out of a stored form definition
 * structurally rather than through `formDefinitionSchema`. A historical audit
 * has to survive definitions that no longer validate; a strict parse would
 * throw away exactly the oldest rows we most want to look at.
 *
 * Manual-option questions are excluded because their values are author-supplied
 * rather than derived, so `catalogValue` never had a say in them.
 */
function presetQuestions(definition: unknown): PresetQuestion[] {
  if (!isRecord(definition) || !Array.isArray(definition.questions)) return [];
  const found: PresetQuestion[] = [];
  for (const question of definition.questions) {
    if (!isRecord(question)) continue;
    if (typeof question.type !== "string") continue;
    if (!CHOICE_QUESTION_TYPES.has(question.type)) continue;
    if (question.optionSource !== "preset") continue;
    if (typeof question.id !== "string") continue;
    if (typeof question.presetCatalogId !== "string") continue;
    found.push({
      catalogId: question.presetCatalogId,
      questionId: question.id,
    });
  }
  return found;
}

/** Checkbox answers store an array of selections; every other choice type stores one. */
function selections(answer: unknown): unknown[] {
  return Array.isArray(answer) ? answer : [answer];
}

/**
 * Compares every stored preset-catalog answer against the value the current
 * `catalogValue` produces for its stored label. A disagreement means the row was
 * written by an implementation that slugified differently.
 */
export function inspectCatalogValues({
  forms,
  responses,
}: {
  forms: readonly AuditFormRecord[];
  responses: readonly AuditResponseRecord[];
}): CatalogValueAudit {
  const catalogCache = new Map<string, Set<string>>();
  const catalogLabels = (catalogId: string) => {
    const cached = catalogCache.get(catalogId);
    if (cached) return cached;
    const labels = new Set(FORMS.getDropdownOptionsFromConst(catalogId));
    catalogCache.set(catalogId, labels);
    return labels;
  };

  const tallies = new Map(
    forms.map((form) => [
      form.id,
      {
        checked: 0,
        formId: form.id,
        formName: form.name,
        mismatches: new Map<string, CatalogValueMismatch>(),
        preplatform: 0,
        responses: 0,
        responsesOutOfScope: 0,
        unlabeled: 0,
        unrecognized: 0,
      },
    ]),
  );
  const liveDefinitions = new Map(
    forms.map((form) => [form.id, form.formData]),
  );

  for (const response of responses) {
    const tally = tallies.get(response.form);
    if (!tally) continue;
    tally.responses += 1;

    // The snapshot records the definition as it stood when the answer was
    // written, which is the version that chose the slug. Fall back to the live
    // definition for rows predating snapshots (the column defaults to `{}`).
    const snapshotQuestions = presetQuestions(response.responseSnapshot);
    const questions =
      snapshotQuestions.length > 0
        ? snapshotQuestions
        : presetQuestions(liveDefinitions.get(response.form));
    if (questions.length === 0 || !isRecord(response.responseData)) {
      tally.responsesOutOfScope += 1;
      continue;
    }

    for (const question of questions) {
      const answer = response.responseData[question.questionId];
      if (answer === undefined) continue;

      for (const selection of selections(answer)) {
        if (!isRecord(selection)) {
          tally.preplatform += 1;
          continue;
        }
        if (selection.kind !== "option") continue; // `other` holds free text.
        if (typeof selection.value !== "string") continue;

        if (typeof selection.label !== "string") {
          tally.unlabeled += 1;
          continue;
        }
        // Only labels that still appear in the hard-coded catalog are carried
        // forward, so every label this audit can report came from
        // `@forge/consts` rather than from stored data.
        if (!catalogLabels(question.catalogId).has(selection.label)) {
          tally.unrecognized += 1;
          continue;
        }

        tally.checked += 1;
        const expected = catalogValue(selection.label);
        if (expected === selection.value) continue;

        const key = `${question.catalogId} ${selection.label} ${selection.value}`;
        const existing = tally.mismatches.get(key);
        if (existing) {
          existing.count += 1;
          continue;
        }
        tally.mismatches.set(key, {
          catalogId: question.catalogId,
          count: 1,
          expected,
          label: selection.label,
          stored: selection.value,
        });
      }
    }
  }

  const rows = [...tallies.values()]
    .map((tally) => ({
      ...tally,
      mismatches: [...tally.mismatches.values()].sort(
        (a, b) => b.count - a.count,
      ),
    }))
    .sort((a, b) => a.formName.localeCompare(b.formName));

  return {
    forms: rows,
    totals: rows.reduce(
      (sum, row) => ({
        checked: sum.checked + row.checked,
        mismatched:
          sum.mismatched + row.mismatches.reduce((n, m) => n + m.count, 0),
        preplatform: sum.preplatform + row.preplatform,
        responses: sum.responses + row.responses,
        responsesOutOfScope: sum.responsesOutOfScope + row.responsesOutOfScope,
        unlabeled: sum.unlabeled + row.unlabeled,
        unrecognized: sum.unrecognized + row.unrecognized,
      }),
      {
        checked: 0,
        mismatched: 0,
        preplatform: 0,
        responses: 0,
        responsesOutOfScope: 0,
        unlabeled: 0,
        unrecognized: 0,
      },
    ),
  };
}

/**
 * Last line of defence on the privacy promise. A mismatched value was written by
 * some older implementation, so its shape is not guaranteed by anything in the
 * tree today. Anything that is not slug-shaped is reported by shape alone, which
 * makes it impossible for the audit to echo a name, an address, or prose.
 */
function printableValue(value: string) {
  return /^[a-z0-9-]{1,64}$/.test(value) ? value : "<non-slug value>";
}

/** Renders the audit as aggregate counts only — no member, no free-text answer. */
export function formatCatalogValueAudit(audit: CatalogValueAudit): string {
  const { forms, totals } = audit;
  const lines = [
    "catalogValue data audit (read-only)",
    `forms: ${forms.length}`,
    `form responses: ${totals.responses}`,
    `responses with no preset-catalog question: ${totals.responsesOutOfScope}`,
    `preset-catalog answers checked: ${totals.checked}`,
    `mismatched answers: ${totals.mismatched}`,
    `skipped, pre-platform answer shape: ${totals.preplatform}`,
    `skipped, no stored label: ${totals.unlabeled}`,
    `skipped, label no longer in catalog: ${totals.unrecognized}`,
    "",
  ];

  const affected = forms.filter((form) => form.mismatches.length > 0);
  if (totals.checked === 0) {
    // Distinguishing this from a clean result matters: a database holding
    // nothing of the audited shape produces the same zeroes as one that is
    // provably consistent, and only one of those two is evidence.
    lines.push(
      "Inconclusive: no answer in this database is stored in the platform",
      "selection shape, so there was no derived value to check. This is not",
      "evidence that historical rows are consistent.",
    );
  } else if (affected.length === 0) {
    lines.push(
      "No mismatches. Every checked answer matches current catalogValue.",
    );
  } else {
    lines.push(
      `Mismatches by form (${affected.length} of ${forms.length} forms):`,
    );
    for (const form of affected) {
      const total = form.mismatches.reduce((n, m) => n + m.count, 0);
      lines.push(
        `  ${form.formName} [${form.formId}] — ${total} of ${form.checked} checked`,
      );
      for (const mismatch of form.mismatches) {
        lines.push(
          `    ${mismatch.catalogId} "${mismatch.label}": expected ${mismatch.expected}, stored ${printableValue(mismatch.stored)} (${mismatch.count})`,
        );
      }
    }
  }

  return lines.join("\n");
}
