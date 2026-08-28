import { execFileSync } from "node:child_process";

export default function stopArchiveE2EContainer() {
  const containerName = process.env.ARCHIVE_E2E_CONTAINER;
  if (!containerName) return;

  try {
    execFileSync("docker", ["stop", containerName], { stdio: "ignore" });
  } catch {
    // The web server may already have stopped and removed the container.
  }
}
