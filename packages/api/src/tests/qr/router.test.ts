import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";

import { qrRouter } from "../../routers/qr";
import { createCallerFactory, createTRPCRouter } from "../../trpc";

const mocks = vi.hoisted(() => ({
  db: {
    query: {
      Member: {
        findFirst: vi.fn(),
      },
    },
  },
  toDataURL: vi.fn(),
}));

vi.mock("@forge/db/client", () => ({
  db: mocks.db,
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: mocks.toDataURL,
  },
}));

const userId = "00000000-0000-4000-8000-000000000001";
const session = {
  user: {
    id: userId,
  },
} as Session;

const callerFactory = createCallerFactory(
  createTRPCRouter({
    qr: qrRouter,
  }),
);

function createCaller(currentSession: Session | null = session) {
  return callerFactory({
    headers: new Headers(),
    session: currentSession,
    source: "qr-router-test",
  });
}

describe("qr.getQRCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.query.Member.findFirst.mockResolvedValue({ id: "member-id" });
    mocks.toDataURL.mockResolvedValue("data:image/png;base64,qr");
  });

  it("generates a QR data URL from the current user's raw auth id", async () => {
    const result = await createCaller().qr.getQRCode();

    expect(result).toEqual({ qrCodeUrl: "data:image/png;base64,qr" });
    expect(mocks.toDataURL).toHaveBeenCalledWith(userId, {
      errorCorrectionLevel: "M",
      margin: 1,
      type: "image/png",
      width: 512,
    });
  });

  it("does not return a member-dashboard QR for authenticated non-members", async () => {
    mocks.db.query.Member.findFirst.mockResolvedValue(null);

    await expect(createCaller().qr.getQRCode()).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Create a member profile before viewing your QR code.",
    });
    expect(mocks.toDataURL).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers", async () => {
    await expect(createCaller(null).qr.getQRCode()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.db.query.Member.findFirst).not.toHaveBeenCalled();
    expect(mocks.toDataURL).not.toHaveBeenCalled();
  });
});
