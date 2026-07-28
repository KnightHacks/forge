/**
 * READ-ONLY data audit. This script issues SELECT statements only — there is no
 * INSERT, UPDATE, DELETE, or DDL anywhere in it or in `src/forms/catalog-audit`,
 * and nothing it prints is derived from a member name, an email address, or a
 * free-text answer. It is safe to point at production.
 *
 * Why it exists: four `catalogValue` implementations once existed and one of
 * them diverged. Two survive today and are byte-identical, so new writes are
 * consistent. Code cannot tell us whether rows written earlier carry values the
 * divergent version produced. Only the stored data can.
 *
 * It is a report, not a gate: it exits 0 whether or not it finds mismatches.
 *
 *   pnpm --filter=@forge/db with-env tsx scripts/audit-catalog-values.ts
 */
import { db } from "../src/client";
import {
  formatCatalogValueAudit,
  inspectCatalogValues,
} from "../src/forms/catalog-audit";
import { FormResponse, FormsSchemas } from "../src/schemas/knight-hacks";

const [forms, responses] = await Promise.all([
  db
    .select({
      formData: FormsSchemas.formData,
      id: FormsSchemas.id,
      name: FormsSchemas.name,
    })
    .from(FormsSchemas),
  db
    .select({
      form: FormResponse.form,
      responseData: FormResponse.responseData,
      responseSnapshot: FormResponse.responseSnapshot,
    })
    .from(FormResponse),
]);

process.stdout.write(
  `${formatCatalogValueAudit(inspectCatalogValues({ forms, responses }))}\n`,
);

// A report, never a gate: mismatches are information for a human, not a failure.
process.exitCode = 0;
await db.$client.end();
