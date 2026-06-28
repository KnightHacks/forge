import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { MemberDetailDialog } from "~/app/_components/admin/members/member-detail-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("~/app/_components/member/member-profile-settings-form", () => ({
  memberProfileFormDefaults: vi.fn(),
  MemberSettingsFieldControl: () => null,
}));

vi.mock("@forge/ui/dialog", async () => {
  const { createElement } = await import("react");
  const Container = ({ children }: { children: ReactNode }) =>
    createElement("div", null, children);

  return {
    Dialog: ({ children }: { children: ReactNode }) =>
      createElement("div", { role: "dialog" }, children),
    DialogClose: Container,
    DialogContent: Container,
    DialogDescription: Container,
    DialogFooter: Container,
    DialogHeader: Container,
    DialogTitle: Container,
    DialogTrigger: Container,
  };
});

vi.mock("~/trpc/react", () => ({
  api: (() => {
    const mutation = () => ({
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
    });
    return {
      member: {
        deleteAdminMember: { useMutation: mutation },
        removeAdminProfilePicture: { useMutation: mutation },
        removeAdminResume: { useMutation: mutation },
        setAdminDuesStatus: { useMutation: mutation },
        updateAdminMember: { useMutation: mutation },
        uploadAdminProfilePicture: { useMutation: mutation },
        uploadAdminResume: { useMutation: mutation },
      },
    };
  })(),
}));

const detail = {
  duesStatus: {
    amountDueLabel: "$25.00",
    amountPaid: 2500,
    paid: true,
    paidAt: new Date("2026-06-27T12:00:00Z"),
    payableAcademicYear: { shortLabel: "2025-2026" },
    paymentAcademicYear: { shortLabel: "2025-2026" },
  },
  member: {
    about: "Build useful tools.",
    age: 25,
    company: "Knight Hacks",
    dateCreated: "2026-06-27",
    discordUser: "lenny-dragon",
    dob: "2001-02-03",
    email: "lenny@example.test",
    firstName: "Lenny",
    gender: "Prefer not to answer",
    githubProfileUrl: "https://github.com/knighthacks",
    gradDate: "2027-05-02",
    guildProfileVisible: true,
    id: "00000000-0000-4000-8000-000000000001",
    lastName: "Dragonson",
    levelOfStudy: "Undergraduate University (3+ year)",
    linkedinProfileUrl: "https://linkedin.com/company/knight-hacks",
    major: "Computer Science",
    phoneNumber: "407-555-0100",
    points: 50,
    profilePictureUrl: "user/profile.png",
    raceOrEthnicity: "Prefer not to answer",
    resumeUrl: "user/resume.pdf",
    school: "University of Central Florida",
    shirtSize: "M",
    tagline: "Builder",
    timeCreated: "12:00:00",
    userId: "00000000-0000-4000-8000-000000000002",
    websiteUrl: "https://knighthacks.org",
  },
  profilePictureUrl: "https://signed.example.test/profile.png",
  resumeUrl: "https://signed.example.test/resume.pdf",
} as RouterOutputs["member"]["getAdminMember"];

describe("MemberDetailDialog", () => {
  it("omits every mutation control for readers", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDetailDialog, {
        canEdit: false,
        detail,
        onChanged: vi.fn(),
        onClose: vi.fn(),
        onDeleted: vi.fn(),
      }),
    );

    expect(html).toContain("Lenny Dragonson");
    expect(html).toContain("lenny@example.test");
    expect(html).not.toContain("Edit member");
    expect(html).not.toContain("Revoke dues");
    expect(html).not.toContain("Delete member");
    expect(html).toContain("Profile files");
    expect(html).toContain("View resume");
    expect(html).not.toContain(">Replace<");
    expect(html).not.toContain(">Upload<");
    expect(html).not.toContain("Remove resume");
  });

  it("shows edit, files, dues, and delete controls for editors", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDetailDialog, {
        canEdit: true,
        detail,
        onChanged: vi.fn(),
        onClose: vi.fn(),
        onDeleted: vi.fn(),
      }),
    );

    expect(html).toContain("Edit member");
    expect(html).toContain('data-member-edit-placement="dialog-header"');
    expect(html).toContain("Revoke dues");
    expect(html).toContain("Profile files");
    expect(html).toContain("View resume");
    expect(html).toContain("Delete member");
  });

  it("organizes the profile into a clear desktop and mobile information hierarchy", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDetailDialog, {
        canEdit: true,
        detail,
        onChanged: vi.fn(),
        onClose: vi.fn(),
        onDeleted: vi.fn(),
      }),
    );

    expect(html).toContain('data-member-detail-layout="sectioned"');
    expect(html).toContain("Membership &amp; dues");
    expect(html).toContain("Contact &amp; identity");
    expect(html).toContain("Academics &amp; work");
    expect(html).toContain("Guild profile");
    expect(html).toContain("Profile files");
    expect(html).toContain("Record details");
  });
});
