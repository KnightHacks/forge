import { TRPCError } from "@trpc/server";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import {
  FormSectionEditRole,
  FormSections,
  FormSectionViewRole,
  FormsSchemas,
} from "@forge/db/schemas/knight-hacks";

import type { PlatformFormActor } from "./actor";
import { createAdminAuditEvent } from "../audit/service";
import { evaluateFormSectionAccess, requireFormCapability } from "./access";
import { auditActor } from "./actor";

export async function sectionPolicies() {
  const [sections, viewers, editors] = await Promise.all([
    db.select().from(FormSections),
    db.select().from(FormSectionViewRole),
    db.select().from(FormSectionEditRole),
  ]);
  return sections.map((section) => ({
    editorRoleIds: editors
      .filter(({ sectionId }) => sectionId === section.id)
      .map(({ roleId }) => roleId),
    id: section.id,
    name: section.name,
    viewerRoleIds: viewers
      .filter(({ sectionId }) => sectionId === section.id)
      .map(({ roleId }) => roleId),
  }));
}

export async function requireSection(
  actor: PlatformFormActor,
  sectionId: string,
) {
  const section = (await sectionPolicies()).find(({ id }) => id === sectionId);
  if (!section) throw new TRPCError({ code: "NOT_FOUND" });
  return { section, access: evaluateFormSectionAccess(actor, section) };
}

export async function requirePlatformFormCapability(
  actor: PlatformFormActor,
  formId: string,
  capability:
    | "delete_response"
    | "edit_definition"
    | "read_definition"
    | "read_responses",
) {
  const form = await db.query.FormsSchemas.findFirst({
    where: eq(FormsSchemas.id, formId),
  });
  if (!form) throw new TRPCError({ code: "NOT_FOUND" });
  const { access, section } = await requireSection(actor, form.sectionId);
  requireFormCapability(access, capability);
  return { access, form, section };
}

export async function provisionFormSection(input: {
  actor: PlatformFormActor;
  editorRoleIds: string[];
  name: string;
  viewerRoleIds: string[];
}) {
  if (!input.actor.permissions.IS_OFFICER)
    throw new TRPCError({ code: "FORBIDDEN" });
  return db.transaction(async (tx) => {
    const [section] = await tx
      .insert(FormSections)
      .values({ name: input.name })
      .returning();
    if (!section) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (input.viewerRoleIds.length > 0)
      await tx.insert(FormSectionViewRole).values(
        input.viewerRoleIds.map((roleId) => ({
          roleId,
          sectionId: section.id,
        })),
      );
    if (input.editorRoleIds.length > 0)
      await tx.insert(FormSectionEditRole).values(
        input.editorRoleIds.map((roleId) => ({
          roleId,
          sectionId: section.id,
        })),
      );
    await createAdminAuditEvent(
      {
        actionKey: "form.section.created",
        actor: auditActor(input.actor),
        metadata: {
          editorRoleIds: input.editorRoleIds,
          name: section.name,
          viewerRoleIds: input.viewerRoleIds,
        },
        subjects: [
          {
            relation: "primary",
            targetId: section.id,
            targetLabel: section.name,
            targetType: "form_section",
          },
        ],
      },
      tx,
    );
    return section;
  });
}

export async function visibleSections(actor: PlatformFormActor) {
  const policies = await sectionPolicies();
  return policies.filter((section) => {
    const access = evaluateFormSectionAccess(actor, section);
    return access.canRead || access.canEdit || access.canReadResponses;
  });
}
