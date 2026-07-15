import { z } from "zod";

import { createFormCallbackRegistry, defineFormCallback } from "./callbacks";

export const formCallbackRegistry = createFormCallbackRegistry([
  defineFormCallback({
    description: "Assign one code-approved Discord role after submission.",
    inputSchema: z.object({
      memberId: z.string().uuid(),
      roleId: z.string().uuid(),
    }),
    label: "Assign Discord role",
    requiredPermission: "ASSIGN_ROLES",
    slug: "discord.assign-role",
  }),
  defineFormCallback({
    description: "Send a typed response summary to the recruiting workflow.",
    inputSchema: z.object({
      memberId: z.string().uuid(),
      note: z.string().trim().min(1).max(1_500),
    }),
    label: "Notify recruiting",
    requiredPermission: "EDIT_FORMS",
    slug: "recruiting.notify",
  }),
]);
