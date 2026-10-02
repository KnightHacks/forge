import { describe, expect, it, vi } from "vitest";

vi.mock("@forge/db/client", () => ({ db: {} }));
vi.mock("@forge/utils/discord", () => ({ api: {} }));
vi.mock("../../env", () => ({ env: { BLADE_URL: "https://blade.test" } }));

const { newPrintJobNotice, printJobStatusMessage } =
  await import("../../utils/printing/notifications");

describe("print job Discord messages", () => {
  it("[TC-NEG-011] pings only the queue roles, never hacker text", () => {
    const notice = newPrintJobNotice({
      name: "@everyone <@&123456789012345678> *bold*",
      queueUrl: "https://blade.test/admin/printing",
      roleIds: ["111111111111111111", "222222222222222222"],
      submittedAt: new Date("2026-10-01T15:00:00Z"),
    });

    expect(notice.allowed_mentions).toEqual({
      parse: [],
      roles: ["111111111111111111", "222222222222222222"],
    });
    expect(notice.content).toContain(
      "<@&111111111111111111> <@&222222222222222222>",
    );
    expect(notice.content).not.toContain("@everyone");
    expect(notice.content).not.toContain("<@&123456789012345678>");
    expect(notice.content).toContain("\\*bold\\*");
    expect(notice.content).toContain("<t:1790866800:f>");
    expect(notice.content).toContain("https://blade.test/admin/printing");
  });

  it("[TC-007/014] gives the status, note, estimate, and tracker link", () => {
    const message = printJobStatusMessage({
      estimatedReadyAt: new Date("2026-10-01T15:40:00Z"),
      note: "Which color? @here",
      portalUrl: "https://khix.knighthacks.org/dashboard/printing",
      status: "printing",
    });

    expect(message).toContain("**Printing**");
    expect(message).not.toContain("@here");
    expect(message).toContain("<t:1790869200:t> (<t:1790869200:R>)");
    expect(message).toContain(
      "Track your print: https://khix.knighthacks.org/dashboard/printing",
    );
    expect(
      printJobStatusMessage({
        estimatedReadyAt: null,
        note: null,
        portalUrl: null,
        status: "ready_for_pickup",
      }),
    ).not.toContain("Estimated ready");
  });
});
