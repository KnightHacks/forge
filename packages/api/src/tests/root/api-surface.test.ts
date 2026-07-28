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

// This pins the client-visible API surface. `member-admin.ts` used to export a
// procedure record spread into `memberRouter`, so its 12 permission-aware
// procedures reached clients as `member.*` and shared one namespace with five
// `protectedProcedure` self-service ones. It is now registered as its own
// `memberAdmin` namespace, so the access tier is visible in the call path and
// the file layout matches the surface.
//
// A failure here is not automatically a bug: adding or moving a procedure is a
// real contract change. Update the list in the same commit that makes the
// change, so the diff shows what clients gained or lost.
describe("client-facing API surface", () => {
  it("exposes exactly the documented procedure paths", () => {
    expect(clientFacingSurface()).toMatchSnapshot();
  });

  it("splits admin member procedures out of the member namespace", () => {
    const surface = clientFacingSurface();
    expect(surface).toContain("memberAdmin.getAdminMembers");
    expect(surface).toContain("member.getMember");

    // `member.*` must hold only the protected-tier self-service procedures.
    // Nothing admin-shaped may leak back in through a spread.
    expect(surface.filter((path) => path.startsWith("member.")).sort()).toEqual(
      [
        "member.createMember",
        "member.deleteMember",
        "member.getMember",
        "member.updateGuildPreferences",
        "member.updateMember",
      ],
    );
    expect(
      surface.filter((path) => path.startsWith("memberAdmin.")),
    ).toHaveLength(12);
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
      "memberAdmin",
      "profilePicture",
      "qr",
      "resume",
      "roles",
    ]) {
      expect(namespaces, expected).toContain(expected);
    }
  });
});
