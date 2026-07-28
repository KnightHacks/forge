import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DisposableDatabase } from "@forge/db/testing";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";
import { getDuesAcademicYear } from "@forge/validators";

type DatabaseClient = typeof import("@forge/db/client").db;
type AuthSchemas = typeof import("@forge/db/schemas/auth");
type KnightHacksSchemas = typeof import("@forge/db/schemas/knight-hacks");

const SECTION_ID = "00000000-0000-4000-8000-000000000001";
const ROLE_ID = "00000000-0000-4000-8000-000000000002";
const RESTRICTED_FORM_ID = "00000000-0000-4000-8000-000000000003";
const DUES_FORM_ID = "00000000-0000-4000-8000-000000000004";
const INSTRUCTION_ID = "00000000-0000-4000-8000-000000000005";
const RESPONSE_ID = "00000000-0000-4000-8000-000000000006";

const OUTSIDER = {
  memberId: "20000000-0000-4000-8000-000000000001",
  userId: "10000000-0000-4000-8000-000000000001",
};
const INSIDER = {
  memberId: "20000000-0000-4000-8000-000000000002",
  userId: "10000000-0000-4000-8000-000000000002",
};
const RESPONDED = {
  memberId: "20000000-0000-4000-8000-000000000003",
  userId: "10000000-0000-4000-8000-000000000003",
};

const RESTRICTED_SLUG = "dev-team-only";
const DUES_SLUG = "dues-only";
const CLOSED_AT = new Date("2020-01-01T00:00:00.000Z");

/**
 * A published form carries its instructions to whoever is allowed to read it,
 * and instruction bodies are exactly what the closed-plus-restricted hole
 * leaked, so every fixture form has one.
 */
function definition(title: string) {
  return {
    description: "",
    instructions: [
      { body: "Internal runbook link", id: INSTRUCTION_ID, type: "text" },
    ],
    questions: [],
    title,
  };
}

function memberRow(actor: { memberId: string; userId: string }, name: string) {
  return {
    age: 21,
    discordUser: `${name}#0001`,
    dob: "2003-01-01",
    email: `${name}@knighthacks.org`,
    firstName: name,
    gradDate: "2027-05-01",
    id: actor.memberId,
    lastName: "Member",
    levelOfStudy: "Undergraduate University (3+ year)" as const,
    school: "University of Central Florida" as const,
    shirtSize: "M" as const,
    userId: actor.userId,
  };
}

/**
 * Seeds only what `respondentForm` reads: the form and its section, the
 * respondent-role rows, a User and Member per actor, `Permissions` for the role
 * holder, `DuesPayment` for the payer, and one existing response.
 */
async function seed(
  client: DatabaseClient,
  auth: AuthSchemas,
  knightHacks: KnightHacksSchemas,
) {
  await client.insert(auth.User).values(
    [OUTSIDER, INSIDER, RESPONDED].map((actor, index) => ({
      discordUserId: `discord-${index}`,
      id: actor.userId,
    })),
  );
  await client.insert(auth.Roles).values({
    discordRoleId: "discord-dev-team",
    id: ROLE_ID,
    permissions: "",
  });
  // Only the insider holds the role. The other two are ordinary signed-in
  // members, which is the whole population the regression exposed the form to.
  await client
    .insert(auth.Permissions)
    .values({ roleId: ROLE_ID, userId: INSIDER.userId });

  await client
    .insert(knightHacks.Member)
    .values([
      memberRow(OUTSIDER, "outsider"),
      memberRow(INSIDER, "insider"),
      memberRow(RESPONDED, "responded"),
    ]);
  // `buildDuesStatus` reads the academic year the run happens in, so the row
  // has to be dated relative to now rather than to a fixed year.
  await client.insert(knightHacks.DuesPayment).values({
    amount: 1_000,
    memberId: INSIDER.memberId,
    paymentDate: new Date(),
    year: getDuesAcademicYear().startYear,
  });

  await client
    .insert(knightHacks.FormSections)
    .values({ id: SECTION_ID, name: "General" });
  await client.insert(knightHacks.FormsSchemas).values([
    {
      closesAt: CLOSED_AT,
      formData: definition("Dev Team Only"),
      formValidatorJson: {},
      id: RESTRICTED_FORM_ID,
      name: "Dev Team Only",
      sectionId: SECTION_ID,
      slugName: RESTRICTED_SLUG,
      state: "published",
    },
    {
      closesAt: CLOSED_AT,
      duesOnly: true,
      formData: definition("Dues Only"),
      formValidatorJson: {},
      id: DUES_FORM_ID,
      name: "Dues Only",
      sectionId: SECTION_ID,
      slugName: DUES_SLUG,
      state: "published",
    },
  ]);
  await client
    .insert(knightHacks.FormResponseRoles)
    .values({ formId: RESTRICTED_FORM_ID, roleId: ROLE_ID });

  await client.insert(knightHacks.FormResponse).values({
    form: RESTRICTED_FORM_ID,
    id: RESPONSE_ID,
    responseData: {},
    userId: RESPONDED.userId,
  });
}

/**
 * Proves `respondentForm` itself refuses an ineligible respondent, against real
 * SQL rather than a mocked `db`.
 *
 * The unit tests next door prove `isFormRespondentEligible` returns the right
 * answer; they cannot prove the procedure asks. `evaluateFormRespondentState`
 * returns one value and checks timing first, so a role-restricted form that has
 * closed reports `"closed"` and never reaches its eligibility branch — which
 * made the form, and its instruction attachments, readable by any signed-in
 * member the moment it stopped accepting responses. Deleting the gate in
 * `respondentForm` has to fail a test, and this is that test.
 *
 * Skips rather than fails without a loopback `DATABASE_URL`, so a contributor
 * with no local Postgres still gets a green suite. Start one from the repo root
 * with `docker compose up -d`, then run with `DATABASE_URL=... pnpm test`.
 */
describe.runIf(canRunDatabaseTests())("respondent form authorization", () => {
  let disposable: DisposableDatabase | undefined;

  // `@forge/db/client` builds its pool from DATABASE_URL at module load, and
  // `database-responses` imports it, so both can only be imported once the
  // disposable database exists and the variable points at it.
  let client: DatabaseClient;
  let respondentForm: typeof import("../../utils/forms/database-responses").respondentForm;

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_api");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;

    ({ db: client } = await import("@forge/db/client"));
    const auth = await import("@forge/db/schemas/auth");
    const knightHacks = await import("@forge/db/schemas/knight-hacks");
    ({ respondentForm } = await import("../../utils/forms/database-responses"));

    await seed(client, auth, knightHacks);
  }, 120_000);

  afterAll(async () => {
    // Close the pool before dropping. `drop()` evicts leftover sessions as a
    // backstop, but a pool killed mid-connection emits an unhandled `57P01`.
    await client.$client.end().catch(() => undefined);
    await disposable?.drop();
  }, 30_000);

  it("refuses a member outside the respondent roles once the form has closed", async () => {
    await expect(
      respondentForm(RESTRICTED_SLUG, OUTSIDER.userId),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses an unpaid member on a closed dues-only form", async () => {
    await expect(
      respondentForm(DUES_SLUG, OUTSIDER.userId),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("still returns a submission to the member who made it after they lost eligibility", async () => {
    // The pre-refactor gate was `!eligible && !response`. Dropping the second
    // half would lock people out of their own answers, so the carve-out is as
    // load-bearing as the refusal.
    const view = await respondentForm(RESTRICTED_SLUG, RESPONDED.userId);

    expect(view.respondentState).toMatchObject({
      responseId: RESPONSE_ID,
      status: "submitted",
    });
  });

  it("still shows an eligible member the closed form and its instructions", async () => {
    // Timing is not an authorization failure: the role holder must keep seeing
    // the form, and its instruction bodies, after it closes.
    const view = await respondentForm(RESTRICTED_SLUG, INSIDER.userId);

    expect(view.respondentState).toMatchObject({
      closedAt: CLOSED_AT,
      status: "closed",
    });
    expect(view.definition.instructions).toHaveLength(1);
  });

  it("still shows a paid member the closed dues-only form", async () => {
    // Proves the dues branch reads real `DuesPayment` rows rather than always
    // refusing, which would make the case above pass for the wrong reason.
    const view = await respondentForm(DUES_SLUG, INSIDER.userId);

    expect(view.respondentState).toMatchObject({ status: "closed" });
  });
});
