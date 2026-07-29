import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Proves the workspace version pins are actually applied, not merely declared.
 *
 * This exists because they silently stopped being applied once already.
 * `cafcd731` moved five `pnpm.overrides` — including react and react-dom — out
 * of the root package.json and into `overrides:` in pnpm-workspace.yaml, on the
 * strength of a `[WARN] The "pnpm" field in package.json is no longer read`
 * message. That warning comes from whatever pnpm is first on PATH, not from the
 * `packageManager`-pinned pnpm 9.12.1 that corepack hands the install to, and
 * 9.12.1 reads package.json. `overrides:` in pnpm-workspace.yaml is a pnpm 10
 * feature. So the move took the pins from live to inert, which is the exact
 * failure it claimed to be fixing, and every gate stayed green because nothing
 * anywhere asserts that a pin resolved.
 *
 * The cost of getting this wrong is not abstract. A duplicate React produces a
 * null-dispatcher crash during prerender that reads like an unrelated build
 * failure and gets chased for hours.
 *
 * The lockfile is the only honest witness: pnpm writes an `overrides:` block
 * there when — and only when — it read the pins from a location it understands.
 * Asserting against the lockfile therefore survives a pnpm upgrade moving the
 * settings home again, which a test asserting the *declaration* site would not.
 */

const repoRoot = new URL("../../../../../", import.meta.url);

async function readRepoFile(relativePath: string) {
  return readFile(fileURLToPath(new URL(relativePath, repoRoot)), "utf8");
}

/** The `overrides:` block pnpm writes into the lockfile, as name → specifier. */
function parseLockfileOverrides(lockfile: string) {
  const block = /^overrides:\n((?:[ \t]+.*\n)+)/m.exec(lockfile);

  if (!block?.[1]) return null;

  return Object.fromEntries(
    block[1]
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [name, specifier] = line.split(/:\s*/, 2);

        return [
          name?.trim().replace(/^'|'$/g, "") ?? "",
          specifier?.trim().replace(/^'|'$/g, "") ?? "",
        ];
      }),
  );
}

describe("workspace version pins", () => {
  it("are read by pnpm, not merely declared", async () => {
    const [packageJson, lockfile] = await Promise.all([
      readRepoFile("package.json"),
      readRepoFile("pnpm-lock.yaml"),
    ]);
    const declared = (
      JSON.parse(packageJson) as {
        pnpm?: { overrides?: Record<string, string> };
      }
    ).pnpm?.overrides;

    expect(
      declared,
      "root package.json should declare pnpm.overrides",
    ).toBeTruthy();
    // The failure this catches: pins declared somewhere pnpm does not look, so
    // the lockfile has no `overrides:` block at all and every version floats.
    expect(
      parseLockfileOverrides(lockfile),
      "pnpm-lock.yaml has no `overrides:` block, so the declared pins were ignored. Check which pnpm ran the install and where that version reads overrides from.",
    ).toEqual(declared);
  });

  it("resolve react and react-dom to exactly one version each", async () => {
    const lockfile = await readRepoFile("pnpm-lock.yaml");
    // Package entries are top-level two-space keys; anything deeper is a
    // dependency edge naming the same package rather than a resolved version.
    const versionsOf = (name: string) =>
      new Set(
        [...lockfile.matchAll(new RegExp(`^ {2}${name}@([\\d.]+)`, "gm"))].map(
          ([, version]) => version,
        ),
      );

    // A second copy is the null-dispatcher crash described above.
    expect([...versionsOf("react")]).toEqual(["19.2.4"]);
    expect([...versionsOf("react-dom")]).toEqual(["19.2.4"]);
  });
});
