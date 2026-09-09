import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const candidates = [
  process.env.BLENDER_BIN,
  "/Applications/Blender.app/Contents/MacOS/Blender",
  "blender",
].filter(Boolean);

const blender = candidates.find(
  (candidate) => candidate === "blender" || existsSync(candidate),
);

if (!blender) {
  throw new Error(
    "Blender was not found. Install Blender or set BLENDER_BIN before generating the Tech Knight model.",
  );
}

const script = resolve(process.cwd(), "scripts/generate-tech-knight-model.py");
const result = spawnSync(
  blender,
  ["--background", "--python-exit-code", "1", "--python", script],
  {
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
