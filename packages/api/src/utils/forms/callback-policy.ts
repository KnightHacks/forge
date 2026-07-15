import { FORMS } from "@forge/consts";

export const RETRYABLE_FORM_CALLBACK_STATUSES = ["failed", "pending"] as const;

const allowedAssignableDiscordRoleIds = new Set<string>(
  FORMS.ALLOWED_ASSIGNABLE_DISCORD_ROLES,
);

export function assertAllowedFormCallbackDiscordRole(discordRoleId: string) {
  if (!allowedAssignableDiscordRoleIds.has(discordRoleId)) {
    throw new Error(
      "This Discord role is not in the code-owned form callback allowlist.",
    );
  }
}

export function formCallbackDeliveryNonce(executionId: string) {
  return executionId;
}

export function isFormCallbackExecutionClaimable(
  execution: {
    leaseExpiresAt: Date | null;
    status: "cancelled" | "failed" | "pending" | "running" | "succeeded";
  },
  now: Date,
) {
  return (
    RETRYABLE_FORM_CALLBACK_STATUSES.some(
      (status) => execution.status === status,
    ) ||
    (execution.status === "running" &&
      execution.leaseExpiresAt !== null &&
      execution.leaseExpiresAt <= now)
  );
}
