export function shouldSuppressDiscordAuditLogs(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  return environment.BLADE_E2E_AUTH === "true";
}
