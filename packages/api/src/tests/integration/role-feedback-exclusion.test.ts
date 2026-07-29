import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

type DatabaseClient = typeof import("@forge/db/client").db;
type AuthSchemas = typeof import("@forge/db/schemas/auth");
type KnightHacksSchemas = typeof import("@forge/db/schemas/knight-hacks");

const OFFICER_USER = "10000000-0000-4000-8000-000000000001";
const OFFICER_ROLE = "30000000-0000-4000-8000-000000000001";
const TARGET_ROLE = "30000000-0000-4000-8000-000000000002";
const ALREADY_EXCLUDED_ROLE = "30000000-0000-4000-8000-000000000003";
const SECTION_ID = "40000000-0000-4000-8000-000000000001";
const HACKATHON_ID = "50000000-0000-4000-8000-000000000001";

const HOUR = 60 * 60 * 1000;

/**
 * Seven events attached to one role, six of which exist to fail exactly one
 * clause of the impact count. The number an officer agrees to is "events that
 * qualify today and stop qualifying because of this", not "events touching this
 * role", and every clause below is what makes those two different.
 */
const EVENTS = [
  { counts: true, id: "60000000-0000-4000-8000-000000000001", name: "Past A" },
  { counts: true, id: "60000000-0000-4000-8000-000000000002", name: "Past B" },
  { counts: true, id: "60000000-0000-4000-8000-000000000003", name: "Past C" },
  {
    counts: false,
    id: "60000000-0000-4000-8000-000000000004",
    name: "Past, no feedback config",
  },
  { counts: false, id: "60000000-0000-4000-8000-000000000005", name: "Future" },
  {
    counts: false,
    id: "60000000-0000-4000-8000-000000000006",
    name: "Past hackathon event",
  },
  {
    counts: false,
    id: "60000000-0000-4000-8000-000000000007",
    name: "Past, already excluded by another role",
  },
] as const;

const [PAST_A, , , NO_CONFIG, FUTURE, HACKATHON_EVENT, ALREADY_EXCLUDED] =
  EVENTS;

describe.runIf(canRunDatabaseTests())("role event feedback exclusion", () => {
  let disposable: DisposableDatabase | undefined;
  let client: DatabaseClient;
  let auth: AuthSchemas;
  let knightHacks: KnightHacksSchemas;
  let countFeedbackExclusionImpact: typeof import("../../utils/roles/service").countFeedbackExclusionImpact;
  let createDbEventFeedbackService: typeof import("../../utils/events/database-feedback").createDbEventFeedbackService;
  let caller: Awaited<ReturnType<typeof officerCaller>>;

  async function officerCaller() {
    const trpc = await import("../../trpc");
    const { rolesRouter } = await import("../../routers/roles");

    return trpc.createCallerFactory(
      trpc.createTRPCRouter({ roles: rolesRouter }),
    )({
      headers: new Headers(),
      // `resolveRoleDiscordGateway` swaps in the database-backed override for
      // this session shape, so `getRole` resolves without a Discord call —
      // which is also the only way to read `feedbackExclusionImpact` end to end.
      session: {
        session: { id: "e2e-session-feedback", userAgent: "blade-playwright" },
        user: { id: OFFICER_USER, name: "Officer" },
      } as unknown as Session,
      source: "role-feedback-integration",
    });
  }

  function eventRow(
    event: (typeof EVENTS)[number],
    roles: string[],
    offsetHours: number,
    hackathonId: string | null,
  ) {
    return {
      description: event.name,
      end_datetime: new Date(Date.now() + offsetHours * HOUR),
      hackathonId,
      id: event.id,
      location: "Online",
      name: event.name,
      roles,
      start_datetime: new Date(Date.now() + (offsetHours - 1) * HOUR),
      tag: "Workshop",
    };
  }

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_api");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;

    ({ db: client } = await import("@forge/db/client"));
    auth = await import("@forge/db/schemas/auth");
    knightHacks = await import("@forge/db/schemas/knight-hacks");
    ({ countFeedbackExclusionImpact } =
      await import("../../utils/roles/service"));
    ({ createDbEventFeedbackService } =
      await import("../../utils/events/database-feedback"));

    await client
      .insert(auth.User)
      .values({ discordUserId: "discord-officer", id: OFFICER_USER });
    await client.insert(auth.Roles).values([
      {
        discordRoleId: "990000000000000101",
        id: OFFICER_ROLE,
        name: "Officers",
        permissions: permissionBitstring("IS_OFFICER"),
      },
      {
        discordRoleId: "990000000000000102",
        id: TARGET_ROLE,
        name: "Workshop Staff",
        permissions: "",
      },
      {
        discordRoleId: "990000000000000103",
        eventFeedbackExcluded: true,
        id: ALREADY_EXCLUDED_ROLE,
        name: "Already Excluded",
        permissions: "",
      },
    ]);
    await client
      .insert(auth.Permissions)
      .values({ roleId: OFFICER_ROLE, userId: OFFICER_USER });

    await client.insert(knightHacks.Hackathon).values({
      endDate: new Date(),
      id: HACKATHON_ID,
      name: "KH X",
      startDate: new Date(),
      theme: "Space",
    });
    await client
      .insert(knightHacks.FormSections)
      .values({ id: SECTION_ID, name: "General" });

    await client
      .insert(knightHacks.Event)
      .values([
        ...EVENTS.slice(0, 4).map((event) =>
          eventRow(event, [TARGET_ROLE], -24, null),
        ),
        eventRow(FUTURE, [TARGET_ROLE], 24, null),
        eventRow(HACKATHON_EVENT, [TARGET_ROLE], -24, HACKATHON_ID),
        eventRow(
          ALREADY_EXCLUDED,
          [TARGET_ROLE, ALREADY_EXCLUDED_ROLE],
          -24,
          null,
        ),
      ]);

    // Every event except `NO_CONFIG` carries a feedback config, so that one
    // event fails exactly the config clause and nothing else.
    const configured = EVENTS.filter((event) => event.id !== NO_CONFIG.id);
    await client.insert(knightHacks.FormsSchemas).values(
      configured.map((event, index) => ({
        formData: {},
        formValidatorJson: {},
        id: `70000000-0000-4000-8000-00000000000${index + 1}`,
        name: `Feedback ${event.name}`,
        sectionId: SECTION_ID,
        slugName: `feedback-${index + 1}`,
      })),
    );
    await client.insert(knightHacks.EventFeedbackConfig).values(
      configured.map((event, index) => ({
        closesAt: new Date(Date.now() + 7 * 24 * HOUR),
        eventId: event.id,
        formId: `70000000-0000-4000-8000-00000000000${index + 1}`,
      })),
    );

    caller = await officerCaller();
  }, 120_000);

  afterAll(async () => {
    await client.$client.end().catch(() => undefined);
    await disposable?.drop();
  }, 30_000);

  it("TC-022: counts only past, non-hackathon, feedback-configured, not-already-excluded events", async () => {
    const attached = await client
      .select({ id: knightHacks.Event.id })
      .from(knightHacks.Event);
    // Positive control: all seven events really do carry the role, so a count
    // of three is a filter doing work rather than a seed that never landed.
    expect(attached).toHaveLength(7);

    expect(await countFeedbackExclusionImpact(TARGET_ROLE)).toBe(
      EVENTS.filter((event) => event.counts).length,
    );
  });

  it("TC-022: the already-excluded clause is what keeps the seventh event out", async () => {
    // `isQualifyingEvent` fails on *any* protected role, so this event is
    // already unreadable today. Counting it would bill this toggle for a loss
    // that has already happened.
    await client
      .update(auth.Roles)
      .set({ eventFeedbackExcluded: false })
      .where(eq(auth.Roles.id, ALREADY_EXCLUDED_ROLE));

    expect(await countFeedbackExclusionImpact(TARGET_ROLE)).toBe(4);

    await client
      .update(auth.Roles)
      .set({ eventFeedbackExcluded: true })
      .where(eq(auth.Roles.id, ALREADY_EXCLUDED_ROLE));
  });

  it("exposes the impact on roles.getRole and never on roles.listLinks", async () => {
    const detail = await caller.roles.getRole({ roleId: TARGET_ROLE });
    const links = await caller.roles.listLinks();

    expect(detail.feedbackExclusionImpact).toEqual({ pastEventCount: 3 });
    expect(detail.eventFeedbackExcluded).toBe(false);
    // The list page renders every linked role, and `buildLinkedRoleViews`
    // already runs one dependency query per role there. A second per-role
    // fan-out for a number one dialog reads is not worth repeating.
    expect(links.every((role) => !("feedbackExclusionImpact" in role))).toBe(
      true,
    );
    expect(links.some((role) => role.id === TARGET_ROLE)).toBe(true);
  });

  it("TC-023: flagging hides the events for feedback and unflagging restores them", async () => {
    const configsBefore = await client
      .select()
      .from(knightHacks.EventFeedbackConfig);

    await caller.roles.updateEventFeedbackExclusion({
      excluded: true,
      roleId: TARGET_ROLE,
    });
    const flagged = await createDbEventFeedbackService();
    expect(await flagged.provisionForEvent({ eventId: PAST_A.id })).toEqual({
      status: "not_applicable",
    });

    await caller.roles.updateEventFeedbackExclusion({
      excluded: false,
      roleId: TARGET_ROLE,
    });
    const restored = await createDbEventFeedbackService();
    expect(
      await restored.provisionForEvent({ eventId: PAST_A.id }),
    ).toMatchObject({ status: "existing" });

    // The data is hidden, not destroyed: nothing was deleted on the way through.
    expect(
      await client.select().from(knightHacks.EventFeedbackConfig),
    ).toHaveLength(configsBefore.length);
  });
});
