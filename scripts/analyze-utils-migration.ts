#!/usr/bin/env tsx
/**
 * Analysis script specifically for the utils package migration.
 * Finds:
 * 1. Functions that exist in both old utils.ts and new utils package
 * 2. Functions that should be migrated but haven't been
 * 3. Remaining imports from old utils
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

interface FunctionInfo {
  name: string;
  file: string;
  line: number;
  signature: string;
}

function shouldIgnoreFile(filePath: string): boolean {
  const ignorePatterns = [
    /node_modules/,
    /\.git/,
    /dist/,
    /\.next/,
    /out/,
    /\.cache/,
    /coverage/,
    /\.turbo/,
    /pnpm-lock\.yaml/,
    /package-lock\.json/,
    /yarn\.lock/,
    /\.d\.ts$/,
    /\.map$/,
    /\.log$/,
    /scripts\/analyze/,
  ];
  return ignorePatterns.some((pattern) => pattern.test(filePath));
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      const filePath = join(dir, file);
      if (shouldIgnoreFile(filePath)) continue;

      try {
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
          getAllFiles(filePath, fileList);
        } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".jsx")) {
          fileList.push(filePath);
        }
      } catch {
        // Skip files we can't access
      }
    }
  } catch {
    // Skip directories we can't access
  }
  return fileList;
}

function extractExportedFunctions(filePath: string, content: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const lines = content.split("\n");

  // Pattern to match exported functions/constants
  const exportPattern = /^export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(exportPattern);
    if (match) {
      functions.push({
        name: match[1],
        file: filePath,
        line: i + 1,
        signature: line.trim(),
      });
    }
  }

  return functions;
}

function findImports(content: string, importPath: string): string[] {
  const imports: string[] = [];
  const lines = content.split("\n");

  // Match: import { ... } from "path" or import ... from "path"
  const importPattern = new RegExp(`from\\s+["']${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`);
  
  for (const line of lines) {
    if (importPattern.test(line)) {
      // Extract imported names
      const namedImports = line.match(/\{([^}]+)\}/);
      if (namedImports) {
        const names = namedImports[1].split(",").map(n => n.trim().split(/\s+as\s+/)[0]);
        imports.push(...names);
      } else {
        // Default import
        const defaultMatch = line.match(/import\s+(\w+)/);
        if (defaultMatch) {
          imports.push(defaultMatch[1]);
        }
      }
    }
  }

  return imports;
}

function main() {
  const rootDir = join(__dirname, "..");
  console.log("🔍 Analyzing utils package migration status...\n");

  // Get all files
  const files = getAllFiles(rootDir);

  // 1. Check what's exported from old utils.ts
  const oldUtilsPath = join(rootDir, "packages/api/src/utils.ts");
  let oldUtilsExports: FunctionInfo[] = [];
  try {
    const oldUtilsContent = readFileSync(oldUtilsPath, "utf-8");
    oldUtilsExports = extractExportedFunctions(oldUtilsPath, oldUtilsContent);
    console.log(`📦 Old utils.ts exports: ${oldUtilsExports.length} items`);
    for (const exp of oldUtilsExports) {
      console.log(`   - ${exp.name}`);
    }
  } catch {
    console.log("⚠️  Could not read old utils.ts");
  }

  // 2. Check what's exported from new utils package
  const newUtilsPath = join(rootDir, "packages/utils/src");
  const newUtilsFiles = getAllFiles(newUtilsPath);
  const newUtilsExports: FunctionInfo[] = [];
  for (const file of newUtilsFiles) {
    try {
      const content = readFileSync(file, "utf-8");
      const exports = extractExportedFunctions(file, content);
      newUtilsExports.push(...exports);
    } catch {
      // Skip
    }
  }
  console.log(`\n📦 New @forge/utils exports: ${newUtilsExports.length} items`);
  const newUtilsNames = new Set(newUtilsExports.map(e => e.name));
  for (const name of Array.from(newUtilsNames).sort()) {
    console.log(`   - ${name}`);
  }

  // 3. Find imports from old utils
  console.log("\n" + "=".repeat(80));
  console.log("IMPORTS FROM OLD UTILS");
  console.log("=".repeat(80));
  
  const oldUtilsImports: Map<string, string[]> = new Map();
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const imports = findImports(content, "../utils");
      if (imports.length > 0) {
        oldUtilsImports.set(file, imports);
      }
    } catch {
      // Skip
    }
  }

  if (oldUtilsImports.size === 0) {
    console.log("✅ No imports from old utils found!\n");
  } else {
    console.log(`⚠️  Found ${oldUtilsImports.size} file(s) importing from old utils:\n`);
    for (const [file, imports] of Array.from(oldUtilsImports.entries()).sort()) {
      const relPath = relative(rootDir, file);
      console.log(`   ${relPath}:`);
      for (const imp of imports) {
        console.log(`     - ${imp}`);
      }
    }
    console.log();
  }

  // 4. Find imports from new utils
  console.log("=".repeat(80));
  console.log("IMPORTS FROM NEW @forge/utils");
  console.log("=".repeat(80));
  
  const newUtilsImports: Map<string, string[]> = new Map();
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const imports = findImports(content, "@forge/utils");
      if (imports.length > 0) {
        newUtilsImports.set(file, imports);
      }
    } catch {
      // Skip
    }
  }

  console.log(`✅ Found ${newUtilsImports.size} file(s) importing from new utils\n`);

  // 5. Find duplicate function names (actual utility functions)
  console.log("=".repeat(80));
  console.log("DUPLICATE UTILITY FUNCTIONS");
  console.log("=".repeat(80));
  
  const allExports = new Map<string, FunctionInfo[]>();
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const exports = extractExportedFunctions(file, content);
      for (const exp of exports) {
        if (!allExports.has(exp.name)) {
          allExports.set(exp.name, []);
        }
        allExports.get(exp.name)!.push(exp);
      }
    } catch {
      // Skip
    }
  }

  // Filter to utility-like function names (not React components, not common keywords)
  const utilityNames = [
    "formatDateRange",
    "getPermsAsList",
    "formatHourTime",
    "formatDateTime",
    "getFormattedDate",
    "hasPermission",
    "controlPerms",
    "isDiscordAdmin",
    "isDiscordMember",
    "isDiscordVIP",
    "resolveDiscordUserId",
    "addRoleToMember",
    "removeRoleFromMember",
    "log",
    "logger",
    "sendEmail",
    "createForm",
    "generateJsonSchema",
    "regenerateMediaUrls",
  ];

  const duplicates: Array<{ name: string; locations: FunctionInfo[] }> = [];
  for (const name of utilityNames) {
    const locations = allExports.get(name) || [];
    if (locations.length > 1) {
      duplicates.push({ name, locations });
    }
  }

  if (duplicates.length === 0) {
    console.log("✅ No duplicate utility functions found!\n");
  } else {
    console.log(`⚠️  Found ${duplicates.length} duplicate utility function(s):\n`);
    for (const { name, locations } of duplicates) {
      console.log(`\n📌 ${name} (${locations.length} definition(s)):`);
      for (const loc of locations) {
        const relPath = relative(rootDir, loc.file);
        console.log(`   - ${relPath}:${loc.line}`);
        console.log(`     ${loc.signature.substring(0, 80)}${loc.signature.length > 80 ? "..." : ""}`);
      }
    }
    console.log();
  }

  // 6. Summary
  console.log("=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`Old utils.ts exports: ${oldUtilsExports.length}`);
  console.log(`New @forge/utils exports: ${newUtilsExports.length}`);
  console.log(`Files importing from old utils: ${oldUtilsImports.size}`);
  console.log(`Files importing from new utils: ${newUtilsImports.size}`);
  console.log(`Duplicate utility functions: ${duplicates.length}`);
  console.log("=".repeat(80));
}

main();
