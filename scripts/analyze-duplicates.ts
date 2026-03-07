#!/usr/bin/env tsx
/**
 * Static analysis script to find:
 * 1. Functions with the same name declared in multiple places
 * 2. Duplicate code blocks (lines of code that appear multiple times)
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

interface FunctionDefinition {
  name: string;
  file: string;
  line: number;
  type: "function" | "const" | "async" | "class" | "method";
  signature: string;
}

interface DuplicateCodeBlock {
  lines: string[];
  occurrences: Array<{ file: string; startLine: number }>;
}

// Patterns to match function definitions
const FUNCTION_PATTERNS = [
  // export function name(...)
  /^export\s+(?:async\s+)?function\s+(\w+)\s*\(/,
  // export const name = function(...)
  /^export\s+const\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(/,
  // export const name = (...)
  /^export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\(/,
  // export const name = { ... }
  /^export\s+const\s+(\w+)\s*=\s*\{/,
  // export class Name
  /^export\s+class\s+(\w+)/,
  // export const name = class
  /^export\s+const\s+(\w+)\s*=\s*class/,
  // method: function(...) or method(...)
  /^\s*(\w+)\s*:\s*(?:async\s+)?function\s*\(/,
  /^\s*(\w+)\s*:\s*(?:async\s+)?\(/,
  // method() { or async method() {
  /^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/,
];

// Patterns to match non-exported functions (for internal duplicates)
const INTERNAL_FUNCTION_PATTERNS = [
  /^(?:async\s+)?function\s+(\w+)\s*\(/,
  /^const\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(/,
  /^const\s+(\w+)\s*=\s*(?:async\s+)?\(/,
  /^class\s+(\w+)/,
];

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

function extractFunctions(filePath: string, content: string): FunctionDefinition[] {
  const functions: FunctionDefinition[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check export patterns first
    for (const pattern of FUNCTION_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const name = match[1];
        functions.push({
          name,
          file: filePath,
          line: i + 1,
          type: line.includes("class") ? "class" : line.includes("async") ? "async" : line.includes("function") ? "function" : "const",
          signature: line.trim(),
        });
        break;
      }
    }
  }

  return functions;
}

function findDuplicateFunctions(functions: FunctionDefinition[]): Map<string, FunctionDefinition[]> {
  const byName = new Map<string, FunctionDefinition[]>();
  
  for (const func of functions) {
    if (!byName.has(func.name)) {
      byName.set(func.name, []);
    }
    byName.get(func.name)!.push(func);
  }

  // Filter to only duplicates
  const duplicates = new Map<string, FunctionDefinition[]>();
  for (const [name, defs] of byName) {
    if (defs.length > 1) {
      duplicates.set(name, defs);
    }
  }

  return duplicates;
}

function findDuplicateCodeBlocks(files: string[], minLines: number = 5): DuplicateCodeBlock[] {
  const codeBlocks = new Map<string, Array<{ file: string; startLine: number }>>();

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");

      // Extract code blocks of minLines length
      for (let i = 0; i <= lines.length - minLines; i++) {
        const block = lines.slice(i, i + minLines).join("\n").trim();
        
        // Skip blocks that are too generic (mostly whitespace, comments, etc.)
        const nonWhitespace = block.replace(/\s+/g, "");
        if (nonWhitespace.length < 20) continue;
        
        // Skip blocks that are mostly comments
        const commentRatio = (block.match(/\/\/|\/\*|\*/g) || []).length / block.split("\n").length;
        if (commentRatio > 0.5) continue;

        const key = block;
        if (!codeBlocks.has(key)) {
          codeBlocks.set(key, []);
        }
        codeBlocks.get(key)!.push({ file, startLine: i + 1 });
      }
    } catch {
      // Skip files we can't read
    }
  }

  // Filter to only duplicates (appearing in multiple files or multiple times in same file)
  const duplicates: DuplicateCodeBlock[] = [];
  for (const [block, occurrences] of codeBlocks) {
    // Group by file to find true duplicates across files
    const byFile = new Map<string, number>();
    for (const occ of occurrences) {
      byFile.set(occ.file, (byFile.get(occ.file) || 0) + 1);
    }

    // Only consider it a duplicate if it appears in multiple files OR multiple times in one file
    if (byFile.size > 1 || Array.from(byFile.values()).some(count => count > 1)) {
      duplicates.push({
        lines: block.split("\n"),
        occurrences,
      });
    }
  }

  return duplicates;
}

function main() {
  const rootDir = join(__dirname, "..");
  console.log("🔍 Analyzing codebase for duplicates...\n");
  console.log(`Root directory: ${rootDir}\n`);

  // Get all TypeScript/JavaScript files
  const files = getAllFiles(rootDir);
  console.log(`Found ${files.length} files to analyze\n`);

  // Find duplicate functions
  console.log("=".repeat(80));
  console.log("DUPLICATE FUNCTION ANALYSIS");
  console.log("=".repeat(80));
  
  const allFunctions: FunctionDefinition[] = [];
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const functions = extractFunctions(file, content);
      allFunctions.push(...functions);
    } catch {
      // Skip files we can't read
    }
  }

  const duplicateFunctions = findDuplicateFunctions(allFunctions);
  
  if (duplicateFunctions.size === 0) {
    console.log("✅ No duplicate function names found!\n");
  } else {
    console.log(`⚠️  Found ${duplicateFunctions.size} function(s) with duplicate names:\n`);
    
    for (const [name, defs] of Array.from(duplicateFunctions.entries()).sort()) {
      console.log(`\n📌 Function: ${name}`);
      console.log(`   Found ${defs.length} definition(s):`);
      for (const def of defs) {
        const relPath = relative(rootDir, def.file);
        console.log(`   - ${relPath}:${def.line} (${def.type})`);
        console.log(`     ${def.signature.substring(0, 80)}${def.signature.length > 80 ? "..." : ""}`);
      }
    }
    console.log("\n");
  }

  // Find duplicate code blocks
  console.log("=".repeat(80));
  console.log("DUPLICATE CODE BLOCK ANALYSIS");
  console.log("=".repeat(80));
  console.log("(Looking for blocks of 5+ lines that appear multiple times)\n");

  const duplicateBlocks = findDuplicateCodeBlocks(files, 5);
  
  if (duplicateBlocks.length === 0) {
    console.log("✅ No significant duplicate code blocks found!\n");
  } else {
    // Sort by number of occurrences
    duplicateBlocks.sort((a, b) => b.occurrences.length - a.occurrences.length);
    
    console.log(`⚠️  Found ${duplicateBlocks.length} duplicate code block(s):\n`);
    
    // Show top 20 duplicates
    const topDuplicates = duplicateBlocks.slice(0, 20);
    for (let i = 0; i < topDuplicates.length; i++) {
      const block = topDuplicates[i];
      console.log(`\n📌 Duplicate Block #${i + 1} (${block.occurrences.length} occurrence(s)):`);
      
      // Group by file
      const byFile = new Map<string, number[]>();
      for (const occ of block.occurrences) {
        if (!byFile.has(occ.file)) {
          byFile.set(occ.file, []);
        }
        byFile.get(occ.file)!.push(occ.startLine);
      }

      for (const [file, lines] of byFile) {
        const relPath = relative(rootDir, file);
        console.log(`   ${relPath}:`);
        for (const line of lines) {
          console.log(`     - Line ${line}`);
        }
      }
      
      console.log(`   Preview (first 3 lines):`);
      for (let j = 0; j < Math.min(3, block.lines.length); j++) {
        console.log(`     ${block.lines[j]?.substring(0, 70)}${(block.lines[j]?.length || 0) > 70 ? "..." : ""}`);
      }
    }
    
    if (duplicateBlocks.length > 20) {
      console.log(`\n   ... and ${duplicateBlocks.length - 20} more duplicate blocks`);
    }
    console.log("\n");
  }

  // Summary
  console.log("=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total files analyzed: ${files.length}`);
  console.log(`Total functions found: ${allFunctions.length}`);
  console.log(`Duplicate function names: ${duplicateFunctions.size}`);
  console.log(`Duplicate code blocks: ${duplicateBlocks.length}`);
  console.log("=".repeat(80));
}

main();
