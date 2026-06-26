#!/usr/bin/env tsx
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const slug = process.argv[2];
const name = process.argv.slice(3).join(" ") || slug;

if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(
    "Usage: pnpm forge:feature <feature-slug> [Human Readable Name]",
  );
  console.error(
    "Slug must be lowercase kebab-case, e.g. hackathon-applications",
  );
  process.exit(1);
}

const root = process.cwd();
const templateDir = join(root, ".forge", "templates", "feature");
const targetDir = join(root, ".forge", "features", slug);

if (!existsSync(templateDir)) {
  console.error(`Missing template directory: ${templateDir}`);
  process.exit(1);
}

if (existsSync(targetDir)) {
  console.error(`Feature already exists: ${targetDir}`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
for (const file of readdirSync(templateDir)) {
  const source = join(templateDir, file);
  const target = join(targetDir, file);
  const content = readFileSync(source, "utf8")
    .replaceAll("<Feature Name>", name)
    .replaceAll("<feature-slug>", slug);
  writeFileSync(target, content);
}

console.log(`Created .forge/features/${slug}`);
console.log(
  "Next: use the spec/srd/test-case skills to reverse-prompt the human before filling content.",
);
