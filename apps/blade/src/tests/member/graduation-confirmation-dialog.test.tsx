import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GraduationConfirmationDialog } from "~/app/_components/member/graduation-confirmation-dialog";

vi.mock("@forge/ui/dialog", () => {
  const Container = ({
    children,
    ...props
  }: {
    children?: ReactNode;
    [key: string]: unknown;
  }) => createElement("div", props, children);

  return {
    Dialog: Container,
    DialogContent: Container,
    DialogDescription: Container,
    DialogFooter: Container,
    DialogHeader: Container,
    DialogTitle: Container,
  };
});

describe("GraduationConfirmationDialog", () => {
  it("TC-001 requires one explicit path and provides no dismiss action", () => {
    const html = renderToStaticMarkup(
      createElement(GraduationConfirmationDialog, {
        currentGraduationLabel: "Spring 2026",
        isPending: false,
        onConfirmGraduated: vi.fn(),
        onExtendGraduation: vi.fn(),
      }),
    );

    expect(html).toContain('data-graduation-confirmation="required"');
    expect(html).toContain("Did you graduate?");
    expect(html).toContain("I graduated");
    expect(html).toContain("My graduation date changed");
    expect(html).not.toContain("Maybe later");
    expect(html).not.toContain("Close");
  });

  it("TC-002 exposes term and year fields for the changed-date path", () => {
    const html = renderToStaticMarkup(
      createElement(GraduationConfirmationDialog, {
        currentGraduationLabel: "Spring 2026",
        isPending: false,
        onConfirmGraduated: vi.fn(),
        onExtendGraduation: vi.fn(),
      }),
    );

    expect(html).toContain('name="gradTerm"');
    expect(html).toContain('name="gradYear"');
    expect(html).toContain("Spring");
    expect(html).toContain("Summer");
    expect(html).toContain("Fall");
    expect(html).toContain("Update graduation date");
  });
});
