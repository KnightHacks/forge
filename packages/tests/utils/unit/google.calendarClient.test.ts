import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock googleapis
const mockCalendar = vi.fn();
const mockGmail = vi.fn();
const mockJWT = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    calendar: mockCalendar,
    gmail: mockGmail,
    auth: {
      JWT: mockJWT,
    },
  },
}));

describe("google.calendarClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear module cache
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("should initialize calendar and gmail clients on module load", async () => {
    const mockAuth = {
      // Mock auth object
    };
    mockJWT.mockReturnValue(mockAuth);
    const mockCalendarClient = { test: "calendar" };
    const mockGmailClient = { test: "gmail" };
    mockCalendar.mockReturnValue(mockCalendarClient);
    mockGmail.mockReturnValue(mockGmailClient);

    const googleModule = await import("@forge/utils/google");

    expect(mockJWT).toHaveBeenCalled();
    expect(mockCalendar).toHaveBeenCalledWith({
      version: "v3",
      auth: mockAuth,
    });
    expect(mockGmail).toHaveBeenCalledWith({
      version: "v1",
      auth: mockAuth,
    });
    expect(googleModule.calendar).toBe(mockCalendarClient);
    expect(googleModule.gmail).toBe(mockGmailClient);
  });
});
