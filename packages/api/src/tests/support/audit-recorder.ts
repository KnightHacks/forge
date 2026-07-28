import { vi } from "vitest";

import { AdminAuditEvent, AdminAuditSubject } from "@forge/db/schemas/audit";

export const AUDIT_EVENT_ID = "22222222-2222-4222-8222-222222222222";

export interface AuditEventRow {
  actionKey: string;
  actorMemberId: string | null;
  actorUserId: string;
  domain: string;
  metadata: Record<string, unknown>;
  operationId: string | null;
  outcome: string;
}

export interface AuditSubjectRow {
  eventId: string;
  memberId: string | null;
  metadata: Record<string, unknown>;
  position: number;
  relation: string;
  resultOutcome: string | null;
  targetId: string;
  targetLabel: string;
  targetType: string;
}

// An audit event is written inside a transaction, but its storage-cleanup
// results are appended afterwards through the top-level client. One recorder
// stands in for both executors, so appended rows land next to the event they
// belong to exactly as they would in one table, and `appendAdminAuditResults`
// reads back what was actually written rather than a fixed row.
//
// The Blade E2E harness skips these writes, so nothing reaches them end to end.
// Recording what each executor call carries is the coverage the audit tables
// get.
export function createAuditRecorder() {
  const events: AuditEventRow[] = [];
  const subjects: AuditSubjectRow[] = [];

  return {
    events,
    subjects,
    // Arrow properties, not methods: both are handed straight to
    // `mockImplementation`, so they have to survive being detached.
    insert: (table: unknown) => {
      if (table === AdminAuditEvent) {
        return {
          values: (row: AuditEventRow) => {
            events.push(row);

            return {
              returning: () => Promise.resolve([{ id: AUDIT_EVENT_ID }]),
            };
          },
        };
      }

      if (table === AdminAuditSubject) {
        return {
          values: (rows: AuditSubjectRow[]) => {
            subjects.push(...rows);

            return Promise.resolve(undefined);
          },
        };
      }

      return null;
    },
    // `appendAdminAuditResults` re-reads its parent event and the subjects
    // already attached to it. Both are served from what was recorded, so the
    // appended rows are positioned against a real prior write.
    select: () => ({
      from: vi.fn(() => ({
        where: vi.fn(() =>
          Object.assign(
            Promise.resolve(
              subjects.map(({ position, relation }) => ({
                position,
                relation,
              })),
            ),
            {
              limit: vi.fn(() =>
                Promise.resolve(
                  events.map(({ actionKey, operationId }) => ({
                    actionKey,
                    operationId,
                  })),
                ),
              ),
            },
          ),
        ),
      })),
    }),
  };
}
