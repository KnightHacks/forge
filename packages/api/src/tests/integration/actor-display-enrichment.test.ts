import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DisposableDatabase } from "@forge/db/testing";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

type DatabaseClient = typeof import("@forge/db/client").db;
type AuthSchemas = typeof import("@forge/db/schemas/auth");
type KnightHacksSchemas = typeof import("@forge/db/schemas/knight-hacks");

const RENAMED = {
  memberId: "20000000-0000-4000-8000-000000000010",
  userId: "10000000-0000-4000-8000-000000000010",
};

function memberRow(actor: { memberId: string; userId: string }) {
  return {
    age: 21,
    discordUser: "renamed#0001",
    dob: "2003-01-01",
    email: "renamed@knighthacks.org",
    firstName: "Current",
    gradDate: "2027-05-01",
    id: actor.memberId,
    lastName: "Name",
    levelOfStudy: "Undergraduate University (3+ year)" as const,
    school: "University of Central Florida" as const,
    shirtSize: "M" as const,
    userId: actor.userId,
  };
}

/**
 * R-20: Issue history and Admin logs store a permanent write-time name
 * snapshot next to a nullable Member/User link. `resolveMemberDisplayNames*`
 * is the only new logic (the router/query call sites just prefer its result
 * over the stored snapshot), so this proves the resolver itself: it returns
 * the *current* name for a linked id, batches into one query, and leaves
 * unresolved ids (deleted/unlinked/system actors) out of the map entirely so
 * callers keep falling back to their stored snapshot.
 *
 * Skips rather than fails without a loopback `DATABASE_URL`. Start one with
 * `docker compose up -d`, then run with `DATABASE_URL=... pnpm test`.
 */
describe.runIf(canRunDatabaseTests())("actor display enrichment", () => {
  let disposable: DisposableDatabase | undefined;
  let client: DatabaseClient;
  let resolveMemberDisplayNames: typeof import("../../utils/member/display-name").resolveMemberDisplayNames;
  let resolveMemberDisplayNamesByUserId: typeof import("../../utils/member/display-name").resolveMemberDisplayNamesByUserId;

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_api");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;

    ({ db: client } = await import("@forge/db/client"));
    const auth: AuthSchemas = await import("@forge/db/schemas/auth");
    const knightHacks: KnightHacksSchemas =
      await import("@forge/db/schemas/knight-hacks");
    ({ resolveMemberDisplayNames, resolveMemberDisplayNamesByUserId } =
      await import("../../utils/member/display-name"));

    await client
      .insert(auth.User)
      .values({ discordUserId: "discord-renamed", id: RENAMED.userId });
    await client.insert(knightHacks.Member).values(memberRow(RENAMED));
  }, 120_000);

  afterAll(async () => {
    await client.$client.end().catch(() => undefined);
    await disposable?.drop();
  }, 30_000);

  it("resolves the member's current name by Member id (Admin log actors)", async () => {
    const names = await resolveMemberDisplayNames([RENAMED.memberId]);
    expect(names.get(RENAMED.memberId)).toBe("Current Name");
  });

  it("resolves the member's current name by User id (Issue history actors)", async () => {
    const names = await resolveMemberDisplayNamesByUserId([RENAMED.userId]);
    expect(names.get(RENAMED.userId)).toBe("Current Name");
  });

  it("leaves unresolved ids out of the map so callers fall back to their stored snapshot", async () => {
    const missingMemberId = "20000000-0000-4000-8000-00000000dead";
    const names = await resolveMemberDisplayNames([
      RENAMED.memberId,
      missingMemberId,
      null,
      undefined,
    ]);
    expect(names.has(missingMemberId)).toBe(false);
    expect(names.size).toBe(1);
  });

  it("returns an empty map without querying when given no ids", async () => {
    expect((await resolveMemberDisplayNames([])).size).toBe(0);
    expect((await resolveMemberDisplayNamesByUserId([null])).size).toBe(0);
  });
});
