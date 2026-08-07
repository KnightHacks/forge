#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, relative } from "node:path";
import { analyzeReactFile } from "react-analyzer/src/index.ts";

const exts = new Set([".tsx", ".jsx"]);
const baseArg = process.argv.find((arg) => arg.startsWith("--base="));

function refExists(ref: string) {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", ref], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function readGit(args: string[]) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function findDefaultBase() {
  const mainRefs = readGit([
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/heads",
    "refs/remotes",
  ])
    .split("\n")
    .filter((ref) => ref === "main" || ref.endsWith("/main"));

  const rankedRefs = mainRefs
    .map((ref) => {
      const mergeBase = readGit(["merge-base", "HEAD", ref]);
      if (!mergeBase) {
        return { ref, distance: Number.POSITIVE_INFINITY };
      }
      const distance = Number(
        readGit(["rev-list", "--count", `${mergeBase}..HEAD`]),
      );
      return { ref, distance };
    })
    .filter(({ distance }) => Number.isFinite(distance))
    .sort((a, b) => a.distance - b.distance);

  return rankedRefs[0]?.ref ?? (refExists("main") ? "main" : "origin/main");
}

const defaultBase = findDefaultBase();
const base = baseArg?.slice("--base=".length) ?? defaultBase;

function git(args: string[]): string[] {
  try {
    const output = execFileSync("git", args, { encoding: "utf8" });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const candidates = new Set<string>();

// Committed branch changes against the base branch.
for (const file of git([
  "diff",
  "--name-only",
  "--diff-filter=ACMR",
  `${base}...HEAD`,
])) {
  candidates.add(file);
}

// Staged changes.
for (const file of git([
  "diff",
  "--name-only",
  "--cached",
  "--diff-filter=ACMR",
])) {
  candidates.add(file);
}

// Unstaged changes.
for (const file of git(["diff", "--name-only", "--diff-filter=ACMR"])) {
  candidates.add(file);
}

const files = [...candidates]
  .filter((file) => exts.has(extname(file)))
  .filter((file) => existsSync(file) && statSync(file).isFile())
  .sort();

if (files.length === 0) {
  console.log(
    JSON.stringify(
      { analyzedFiles: 0, componentCount: 0, failures: 0, results: [] },
      null,
      2,
    ),
  );
  process.exit(0);
}

const results = files.map((file) => {
  const code = readFileSync(file, "utf8");
  try {
    const result = analyzeReactFile(file, code);
    return {
      file: relative(process.cwd(), file),
      ok: true,
      type: result.type,
      components: result.components,
    };
  } catch (error) {
    return {
      file: relative(process.cwd(), file),
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

const componentCount = results.reduce((count, result: any) => {
  if (!result.ok || !Array.isArray(result.components)) return count;
  return count + result.components.length;
}, 0);
const failures = results.filter((result: any) => !result.ok);

console.log(
  JSON.stringify(
    {
      base,
      analyzedFiles: files.length,
      componentCount,
      failures: failures.length,
      results,
    },
    null,
    2,
  ),
);

if (failures.length > 0) {
  process.exitCode = 1;
}
