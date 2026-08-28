import { spawnSync } from "node:child_process";
import type { FullConfig } from "playwright/test";

const containerMetadataKey = "archiveE2EContainer";

export function stopArchiveE2EContainer(containerName: string) {
  const result = spawnSync("docker", ["stop", containerName], {
    encoding: "utf8",
  });

  if (result.status === 0) return;
  if (result.error) throw result.error;

  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (/No such container/i.test(output)) return;

  throw new Error(
    `docker stop failed for ${containerName}: ${output || `exit status ${result.status ?? "unknown"}`}`,
  );
}

export default function teardownArchiveE2E(config: FullConfig) {
  const containerName = config.metadata[containerMetadataKey];
  if (typeof containerName !== "string" || containerName.length === 0) {
    throw new Error(`Playwright metadata is missing ${containerMetadataKey}`);
  }

  stopArchiveE2EContainer(containerName);
}
