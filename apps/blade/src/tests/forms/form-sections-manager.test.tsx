import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { FormSectionsManager } from "~/app/_components/admin/forms/form-sections-manager";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    forms: {
      createSection: {
        useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
      },
      updateSection: {
        useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
      },
    },
  },
}));

const provisioning: RouterOutputs["forms"]["sectionProvisioning"] = {
  roles: [],
  sections: [
    {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      editorRoleIds: ["editor-role"],
      id: "00000000-0000-4000-8000-000000001001",
      name: "Outreach",
      order: 0,
      viewerRoleIds: ["viewer-role"],
    },
    {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      editorRoleIds: [],
      id: "00000000-0000-4000-8000-000000001002",
      name: "Workshops",
      order: 1,
      viewerRoleIds: [],
    },
  ],
};

describe("FormSectionsManager", () => {
  it("renders every provisioned section with an access-editing control", () => {
    const html = renderToStaticMarkup(
      createElement(FormSectionsManager, { provisioning }),
    );

    expect(html).toContain("Outreach");
    expect(html).toContain("Workshops");
    expect(html).toContain("Edit access");
  });
});
