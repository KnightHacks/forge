import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  ADMIN_AUDIT_PROCEDURE_COVERAGE,
  AUDITED_ADMIN_PROCEDURES,
  EXCLUDED_ADMIN_PROCEDURES,
  HYBRID_ADMIN_PROCEDURES,
} from "../../utils/audit/coverage";

const routersDirectory = new URL("../../routers/", import.meta.url);

// Discovered from disk rather than listed by hand. A hand-maintained list only
// covered 10 of 18 routers, so `discordArchive.getHealth` shipped as a
// permProcedure with no declared audit policy and nothing noticed.
async function listRouterFiles() {
  const entries = await readdir(routersDirectory);
  return entries
    .filter((entry) => entry.endsWith(".ts"))
    .map((entry) => entry.replace(/\.ts$/, ""))
    .sort();
}

async function discoverPermissionProcedures() {
  const discovered: string[] = [];
  for (const router of await listRouterFiles()) {
    const source = await readFile(
      new URL(`${router}.ts`, routersDirectory),
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

  it("scans every router on disk, including ones added later", async () => {
    const scanned = await listRouterFiles();
    expect(scanned).toContain("discord-archive");
    expect(scanned.length).toBeGreaterThanOrEqual(18);

    // Guards the regex itself: if it stops matching, the coverage assertion
    // above would compare two empty lists and pass while enforcing nothing.
    const discovered = await discoverPermissionProcedures();
    expect(discovered).toContain("discord-archive.getHealth");
    expect(discovered.length).toBeGreaterThan(100);
  });

  it("keeps audited, hybrid, and excluded declarations disjoint", () => {
    const declarations = [
      ...AUDITED_ADMIN_PROCEDURES,
      ...HYBRID_ADMIN_PROCEDURES,
      ...EXCLUDED_ADMIN_PROCEDURES,
    ];
    expect(new Set(declarations).size).toBe(declarations.length);
  });

  it("keeps every email admin mutation wired to its audit action", async () => {
    const source = await readFile(
      new URL("../../routers/email.ts", import.meta.url),
      "utf8",
    );
    for (const actionKey of [
      "email.template.created",
      "email.template.draft_saved",
      "email.template.published",
      "email.template.archived",
      "email.template.duplicated",
      "email.send.previewed",
      "email.send.confirmed",
      "email.send.cancelled",
      "email.send.retry_queued",
      "email.test.sent",
    ]) {
      expect(source, actionKey).toContain(`"${actionKey}"`);
    }

    const rolesSource = await readFile(
      new URL("../../routers/roles.ts", import.meta.url),
      "utf8",
    );
    expect(rolesSource).toContain('"role.email_audience.updated"');
  });

  it("keeps synthetic Blade E2E actions out of append-only audit storage", async () => {
    const source = await readFile(
      new URL("../../utils/audit/service.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain('import { isBladeE2E } from "../../env"');
    expect(source).toContain(
      "if (isBladeE2E) return { id: BLADE_E2E_AUDIT_EVENT_ID }",
    );
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
