import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  ADMIN_AUDIT_PROCEDURE_COVERAGE,
  AUDITED_ADMIN_PROCEDURES,
  EXCLUDED_ADMIN_PROCEDURES,
  HYBRID_ADMIN_PROCEDURES,
} from "../../utils/audit/coverage";

const routerFiles = [
  "alumni",
  "analytics",
  "audit",
  "career",
  "event",
  "forms",
  "issues",
  "member-admin",
  "roles",
] as const;

async function discoverPermissionProcedures() {
  const discovered: string[] = [];
  for (const router of routerFiles) {
    const source = await readFile(
      new URL(`../../routers/${router}.ts`, import.meta.url),
      "utf8",
    );
    for (const match of source.matchAll(
      /^\s{2}([A-Za-z][A-Za-z0-9]*):\s*permProcedure/gm,
    )) {
      discovered.push(`${router}.${match[1]}`);
    }
  }
  return discovered.sort();
}

describe("admin audit procedure coverage", () => {
  it("forces every permission-aware procedure to declare a policy", async () => {
    expect(await discoverPermissionProcedures()).toEqual(
      Object.keys(ADMIN_AUDIT_PROCEDURE_COVERAGE).sort(),
    );
  });

  it("keeps audited, hybrid, and excluded declarations disjoint", () => {
    const declarations = [
      ...AUDITED_ADMIN_PROCEDURES,
      ...HYBRID_ADMIN_PROCEDURES,
      ...EXCLUDED_ADMIN_PROCEDURES,
    ];
    expect(new Set(declarations).size).toBe(declarations.length);
  });

  it("keeps every officer-escalation path behind the existing-officer guard", async () => {
    const source = await readFile(
      new URL("../../routers/roles.ts", import.meta.url),
      "utf8",
    );
    for (const procedure of [
      "createLink",
      "updatePermissions",
      "syncRole",
      "batchAssign",
      "unlinkRole",
    ]) {
      const start = source.indexOf(`  ${procedure}: permProcedure`);
      const remainder = source.slice(start + 3);
      const nextProcedureOffset = remainder.search(
        /\n {2}[A-Za-z][A-Za-z0-9]*:/,
      );
      const block = source.slice(
        start,
        nextProcedureOffset === -1
          ? undefined
          : start + 3 + nextProcedureOffset,
      );
      expect(start, `${procedure} procedure`).toBeGreaterThanOrEqual(0);
      expect(block, `${procedure} officer guard`).toContain(
        "requireOfficerForOfficerEscalation(ctx)",
      );
    }
  });
});
