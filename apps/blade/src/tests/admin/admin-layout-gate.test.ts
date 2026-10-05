import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@forge/consts";

const mocks = vi.hoisted(() => ({
  permissions: {} as Record<string, boolean>,
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("~/server/auth", () => ({
  auth: () => Promise.resolve({ user: { id: "organizer", name: "Organizer" } }),
}));
vi.mock("~/trpc/server", () => ({
  api: { roles: { getPermissions: () => Promise.resolve(mocks.permissions) } },
}));
vi.mock("~/app/_components/shared/authenticated-shell", () => ({
  AuthenticatedShell: () => null,
}));

function grant(...allowed: PERMISSIONS.PermissionKey[]) {
  mocks.permissions = Object.fromEntries(
    PERMISSIONS.PERMISSION_KEYS.map((key) => [key, allowed.includes(key)]),
  );
}

describe("admin layout gate", () => {
  beforeEach(() => {
    mocks.redirect.mockClear();
  });

  it("[TC-NEG-002] lets a PRINTING_QUEUE-only organizer into admin", async () => {
    grant("PRINTING_QUEUE");
    const { default: AdminLayout } = await import("~/app/admin/layout");

    await expect(AdminLayout({ children: null })).resolves.toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("still sends members with no admin permission to their dashboard", async () => {
    grant();
    const { default: AdminLayout } = await import("~/app/admin/layout");

    await expect(AdminLayout({ children: null })).rejects.toThrow(/^redirect:/);
  });
});
