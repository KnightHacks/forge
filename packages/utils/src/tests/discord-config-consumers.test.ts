import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { DISCORD } from "@forge/consts";

/**
 * `DISCORD.CONFIG_KEY_CONSUMERS` is hand-declared, and the console marks ten of
 * the fourteen rows as read by nothing on the strength of it. That claim decays:
 * the first commit that resolves `vip_role`, or deletes the last
 * `recruiting_channel` call, turns an officer-facing badge into a lie with no
 * other signal. So the classification is re-derived from the source tree here
 * and compared.
 *
 * Same shape as `packages/api/src/tests/audit/coverage.test.ts`, for the same
 * reason: a list nobody is forced to update is a list that stops being true.
 * It lives in `@forge/utils` rather than beside the constant because
 * `@forge/consts` has no test script, and because this package owns the two
 * functions being scanned for.
 */

const workspaceRoot = new URL("../../../../", import.meta.url);

// Only each workspace member's `src` directory is walked.
const SCAN_ROOTS = ["apps", "packages"];
const SKIPPED_DIRECTORIES = new Set(["node_modules", "dist", "tests"]);

/**
 * The module that *declares* `getDiscordConfigId` is the one place in the repo
 * where the call is followed by a parameter rather than a string literal, so the
 * literal-only assertion below would fail on the module it exists to protect.
 * Excluding it costs the live set nothing: the only `getDiscordConfigId("guild")`
 * in it is `getKnightHacksGuildId`'s own body, and `guild` still enters the live
 * set from the twelve modules that call `getKnightHacksGuildId`.
 */
const excludedFile = new URL(
  "packages/utils/src/discord-config.ts",
  workspaceRoot,
).href;

/**
 * The optional capture group is the point: a computed key —
 * `getDiscordConfigId(key)` — matches with no group, and is reported rather than
 * skipped. A scan that quietly ignored one would under-report the live set,
 * which is the direction that matters.
 */
const CONFIG_ID_CALL = /getDiscordConfigId\(\s*(?:"([^"]*)"|'([^']*)')?/g;
const GUILD_HELPER_CALL = "getKnightHacksGuildId(";

interface WorkspaceScan {
  computedCallSites: string[];
  files: string[];
  guildHelperCallSites: string[];
  keyCallSites: string[];
  liveKeys: string[];
}

function relativePath(file: URL) {
  return decodeURIComponent(file.href.slice(workspaceRoot.href.length));
}

async function collectSourceFiles(directory: URL): Promise<URL[]> {
  // A workspace member without a `src` directory contributes nothing rather
  // than failing the walk; the guard assertions below catch a walk that finds
  // nothing at all.
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => [],
  );

  const files: URL[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      files.push(
        ...(await collectSourceFiles(new URL(`${entry.name}/`, directory))),
      );
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;

    const file = new URL(entry.name, directory);
    if (file.href === excludedFile) continue;
    files.push(file);
  }

  return files;
}

async function scanWorkspace(): Promise<WorkspaceScan> {
  const scan: WorkspaceScan = {
    computedCallSites: [],
    files: [],
    guildHelperCallSites: [],
    keyCallSites: [],
    liveKeys: [],
  };
  const liveKeys = new Set<string>();

  for (const root of SCAN_ROOTS) {
    const rootUrl = new URL(`${root}/`, workspaceRoot);
    for (const member of await readdir(rootUrl, { withFileTypes: true })) {
      if (!member.isDirectory()) continue;

      for (const file of await collectSourceFiles(
        new URL(`${member.name}/src/`, rootUrl),
      )) {
        const source = await readFile(file, "utf8");
        const path = relativePath(file);
        scan.files.push(path);

        if (source.includes(GUILD_HELPER_CALL)) {
          scan.guildHelperCallSites.push(path);
          liveKeys.add("guild");
        }

        for (const [, doubleQuoted, singleQuoted] of source.matchAll(
          CONFIG_ID_CALL,
        )) {
          const key = doubleQuoted ?? singleQuoted;
          if (key === undefined) {
            scan.computedCallSites.push(path);
            continue;
          }
          scan.keyCallSites.push(`${path}: ${key}`);
          liveKeys.add(key);
        }
      }
    }
  }

  scan.liveKeys = [...liveKeys].sort();
  return scan;
}

const scan = await scanWorkspace();

describe("Discord config consumer catalog", () => {
  it("finds the call sites it is supposed to compare against", () => {
    // Without this, a broken regex or a mis-resolved root would compare two
    // empty sets and pass while enforcing nothing.
    expect(scan.files.length).toBeGreaterThan(0);
    expect(scan.keyCallSites.length).toBeGreaterThan(0);
    expect(scan.guildHelperCallSites.length).toBeGreaterThan(0);
  });

  it("reads every config key from a string literal", () => {
    // A computed key is invisible to a source scan, so the drift guard below
    // would silently stop covering it.
    expect(scan.computedCallSites).toEqual([]);
  });

  it("classifies exactly the keys the platform actually reads", () => {
    expect(scan.liveKeys).toEqual([...DISCORD.LIVE_CONFIG_KEYS].sort());
  });
});
