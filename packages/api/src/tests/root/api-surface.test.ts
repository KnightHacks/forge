import { describe, expect, it, vi } from "vitest";

import { appRouter } from "../../root";

// Importing the whole `appRouter` constructs every module-scope client along
// the way — Postgres, MinIO, Stripe — none of which this test calls. They are
// stubbed so the surface can be read without standing up infrastructure.
vi.mock("@forge/db/client", () => ({ db: {} }));
vi.mock("@forge/utils/stripe", () => ({ stripe: {} }));
vi.mock("../../utils/profile-picture/storage", () => ({
  profilePictureStorageClient: {},
}));
vi.mock("../../utils/resume/storage", () => ({ resumeStorageClient: {} }));
vi.mock("../../minio/minio-client", () => ({ minioClient: {} }));

/**
 * Every path a client can call, as `namespace.procedure`.
 *
 * Derived from the router rather than hand-listed, so it reflects what
 * `api.*` actually exposes rather than what the file layout suggests.
 */
function clientFacingSurface() {
  const paths: string[] = [];
  const record = appRouter._def.procedures as Record<string, unknown>;
  for (const path of Object.keys(record)) paths.push(path);
  return paths.sort();
}

// This pins the client-visible API surface, which is deliberately NOT the same
// as the file layout. `member-admin.ts` exports a procedure record that is
// spread into `memberRouter`, so its 12 permission-aware procedures reach
// clients as `member.*` — while `utils/audit/coverage.ts` keys them under a
// `member-admin.*` namespace that no client can call. Reconciling that is
// planned work; until then this test makes the discrepancy visible instead of
// letting it drift further.
//
// A failure here is not automatically a bug: adding or moving a procedure is a
// real contract change. Update the list in the same commit that makes the
// change, so the diff shows what clients gained or lost.
describe("client-facing API surface", () => {
  it("exposes exactly the documented procedure paths", () => {
    expect(clientFacingSurface()).toMatchSnapshot();
  });

  it("keeps admin member procedures reachable under the member namespace", () => {
    const surface = clientFacingSurface();
    expect(surface).toContain("member.getAdminMembers");
    expect(surface.some((path) => path.startsWith("member-admin."))).toBe(
      false,
    );
  });

  it("registers every namespace declared in the router record", () => {
    const namespaces = new Set(
      clientFacingSurface().map((path) => path.split(".")[0]),
    );
    for (const expected of [
      "alumni",
      "analytics",
      "audit",
      "auth",
      "career",
      "discordArchive",
      "dues",
      "email",
      "event",
      "forms",
      "guild",
      "issues",
      "member",
      "profilePicture",
      "qr",
      "resume",
      "roles",
    ]) {
      expect(namespaces, expected).toContain(expected);
    }
  });
});
