import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createHackerPortalContext,
  createHackerPortalRouter,
  participantProcedure,
  portalProcedure,
} from "../../hacker-portal/trpc";

const mocks = vi.hoisted(() => ({
  findClient: vi.fn(),
  authenticate: vi.fn(),
  read: vi.fn(),
  mutate: vi.fn(),
}));
vi.mock("@forge/auth/server", () => ({
  databasePortalSessionStore: { findClient: mocks.findClient },
  createPortalSessionService: () => ({ authenticate: mocks.authenticate }),
  PortalAuthError: class extends Error {},
}));
const router = createHackerPortalRouter({
  read: portalProcedure.query(() => {
    mocks.read();
    return true;
  }),
  mutate: participantProcedure.mutation(() => {
    mocks.mutate();
    return true;
  }),
});

describe("hacker portal audience isolation", () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([false, true])(
    "rejects Projects before event operations (bearer=%s)",
    async (bearer) => {
      mocks.findClient.mockResolvedValue({
        id: "projects-record",
        clientId: "projects",
        clientKind: "projects",
        hackathonId: null,
        enabled: true,
        origin: "https://projects.knighthacks.org",
      });
      const headers = new Headers({ "x-forge-portal-client": "projects" });
      if (bearer) headers.set("authorization", "Bearer projects-token");
      const context = await createHackerPortalContext({ headers });
      expect(context.client).toBeNull();
      expect(context.session).toBeNull();
      expect(mocks.authenticate).not.toHaveBeenCalled();
      const caller = router.createCaller(context);
      await expect(caller.read()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.mutate()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(mocks.read).not.toHaveBeenCalled();
      expect(mocks.mutate).not.toHaveBeenCalled();
    },
  );
  it("preserves anonymous event reads but rejects a non-event authenticated session", async () => {
    mocks.findClient.mockResolvedValue({
      id: "event-record",
      clientId: "event",
      clientKind: "hackathon",
      hackathonId: "event-id",
      enabled: true,
      origin: "https://2026.knighthacks.org",
    });
    mocks.authenticate.mockResolvedValue({
      clientKind: "projects",
      hackathonId: null,
    });
    const context = await createHackerPortalContext({
      headers: new Headers({
        "x-forge-portal-client": "event",
        authorization: "Bearer projects-token",
      }),
    });
    expect(context.session).toBeNull();
    const caller = router.createCaller(context);
    await expect(caller.read()).resolves.toBe(true);
    await expect(caller.mutate()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
