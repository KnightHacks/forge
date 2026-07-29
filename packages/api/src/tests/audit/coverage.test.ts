import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  ADMIN_AUDIT_PROCEDURE_COVERAGE,
  AUDITED_ADMIN_PROCEDURES,
  EXCLUDED_ADMIN_PROCEDURES,
  HYBRID_ADMIN_PROCEDURES,
} from "../../utils/audit/coverage";

const routersDirectory = new URL("../../routers/", import.meta.url);

const sourceCache = new Map<string, Promise<string>>();

function readSource(fileUrl: URL) {
  const cached = sourceCache.get(fileUrl.href);
  if (cached) return cached;

  // A resolved identifier may point at a path that is not a module here (a
  // package import, a type-only name); an unreadable file simply contributes
  // nothing rather than failing the scan.
  const pending = readFile(fileUrl, "utf8").catch(() => "");
  sourceCache.set(fileUrl.href, pending);

  return pending;
}

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

function procedureBlock(source: string, procedure: string) {
  const start = source.indexOf(`  ${procedure}: permProcedure`);
  if (start === -1) return null;

  const remainder = source.slice(start + 3);
  const nextProcedureOffset = remainder.search(/\n {2}[A-Za-z][A-Za-z0-9]*:/);

  return source.slice(
    start,
    nextProcedureOffset === -1 ? undefined : start + 3 + nextProcedureOffset,
  );
}

function topLevelDeclaration(source: string, name: string) {
  const declaration = new RegExp(
    `^(?:export\\s+)?(?:async\\s+)?(?:function|const)\\s+${name}\\b`,
    "m",
  ).exec(source);
  if (!declaration) return null;

  const remainder = source.slice(declaration.index + 1);
  const end = remainder.search(
    /\n(?:export|async function|function|const|class|interface|type) /,
  );

  return end === -1
    ? source.slice(declaration.index)
    : source.slice(declaration.index, declaration.index + 1 + end);
}

function relativeImports(source: string, fileUrl: URL) {
  const targets = new Map<string, URL>();
  for (const match of source.matchAll(
    /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+"(\.[^"]+)"/g,
  )) {
    const [, names, path] = match;
    if (!names || !path) continue;

    for (const specifier of names.split(",")) {
      const name = specifier
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) targets.set(name, new URL(`${path}.ts`, fileUrl));
    }
  }

  return targets;
}

// Audited procedures do not all call the audit service inline. The email and
// forms domains delegate to `utils/<domain>/`, and the event router routes
// through module-local helpers. Following the identifiers a procedure body
// mentions through those hops is what makes "declared audited" mean "writes an
// event" rather than "appears in a list".
const MAX_DELEGATION_DEPTH = 4;
const auditWriters = new Map<string, boolean>();

async function reachesAuditService(
  fileUrl: URL,
  snippet: string,
  depth: number,
): Promise<boolean> {
  if (snippet.includes("createAdminAuditEvent")) return true;
  if (depth === 0) return false;

  const imports = relativeImports(await readSource(fileUrl), fileUrl);
  for (const identifier of new Set(
    snippet.match(/\b[A-Za-z_$][\w$]*\b/g) ?? [],
  )) {
    const target = imports.get(identifier) ?? fileUrl;
    const key = `${target.href}#${identifier}`;
    const known = auditWriters.get(key);
    if (known === true) return true;
    // Already resolved, or currently being resolved further up the stack.
    if (known !== undefined) continue;

    auditWriters.set(key, false);
    const declaration = topLevelDeclaration(
      await readSource(target),
      identifier,
    );
    const writes =
      declaration !== null &&
      (await reachesAuditService(target, declaration, depth - 1));
    auditWriters.set(key, writes);
    if (writes) return true;
  }

  return false;
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

  it("makes every audited declaration reach createAdminAuditEvent", async () => {
    const silent: string[] = [];
    for (const procedure of AUDITED_ADMIN_PROCEDURES) {
      const separator = procedure.lastIndexOf(".");
      const routerUrl = new URL(
        `${procedure.slice(0, separator)}.ts`,
        routersDirectory,
      );
      const block = procedureBlock(
        await readSource(routerUrl),
        procedure.slice(separator + 1),
      );

      if (
        block === null ||
        !(await reachesAuditService(routerUrl, block, MAX_DELEGATION_DEPTH))
      ) {
        silent.push(procedure);
      }
    }

    expect(silent).toEqual([]);
  });

  it("does not credit a read-only procedure with writing an audit event", async () => {
    // Guards the resolver itself. `event.listAttendees` is excluded and sits in
    // a router that both writes audit events directly and delegates to local
    // helpers that do, so a resolver that leaked across a file would call it
    // audited and the assertion above would prove nothing.
    const routerUrl = new URL("event.ts", routersDirectory);
    const block = procedureBlock(await readSource(routerUrl), "listAttendees");

    expect(block).not.toBeNull();
    expect(
      await reachesAuditService(routerUrl, block ?? "", MAX_DELEGATION_DEPTH),
    ).toBe(false);
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
    // The email domain spans the router and the workflows it delegates to, so
    // the whole domain is scanned rather than the router file alone.
    const source = (
      await Promise.all(
        [
          "../../routers/email.ts",
          "../../utils/email/campaign.ts",
          "../../utils/email/templates.ts",
        ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
      )
    ).join("\n");
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
