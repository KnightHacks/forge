#!/usr/bin/env tsx
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { analyzeReactFile } from "react-analyzer/src/index.ts";

const roots = process.argv.slice(2);
const targets = roots.length > 0 ? roots : ["apps/blade/src"];
const exts = new Set([".tsx", ".jsx"]);

function walk(path: string): string[] {
  const stat = statSync(path);
  if (stat.isFile()) return exts.has(extname(path)) ? [path] : [];
  if (!stat.isDirectory()) return [];
  const ignored = new Set(["node_modules", ".next", "dist", "build", ".turbo"]);
  return readdirSync(path)
    .filter((entry) => !ignored.has(entry))
    .flatMap((entry) => walk(join(path, entry)));
}

const files = targets.flatMap(walk).sort();
const results = files.map((file) => {
  const code = readFileSync(file, "utf8");
  try {
    return {
      file: relative(process.cwd(), file),
      ok: true,
      ...analyzeReactFile(file, code),
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
