import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import {
  AUDIT_ACTION_CATALOG,
  auditDetailInputSchema,
  auditListInputSchema,
  auditMemberSearchInputSchema,
} from "@forge/validators";

import { permProcedure } from "../trpc";
import { assertCanReadAdminAudit } from "../utils/audit/access";
import {
  getAdminAuditEvent,
  listAdminAuditEvents,
  searchAuditMembers,
} from "../utils/audit/queries";

export const auditRouter = {
  catalog: permProcedure.query(({ ctx }) => {
    assertCanReadAdminAudit(ctx.session.permissions);
    return AUDIT_ACTION_CATALOG;
  }),
  detail: permProcedure
    .input(auditDetailInputSchema)
    .query(async ({ ctx, input }) => {
      assertCanReadAdminAudit(ctx.session.permissions);
      const event = await getAdminAuditEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit event not found",
        });
      }
      return event;
    }),
  list: permProcedure.input(auditListInputSchema).query(({ ctx, input }) => {
    assertCanReadAdminAudit(ctx.session.permissions);
    return listAdminAuditEvents(input);
  }),
  searchMembers: permProcedure
    .input(auditMemberSearchInputSchema)
    .query(({ ctx, input }) => {
      assertCanReadAdminAudit(ctx.session.permissions);
      return searchAuditMembers(input.search, input.limit);
    }),
} satisfies TRPCRouterRecord;
