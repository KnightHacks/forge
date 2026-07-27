import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FormSectionsManager } from "~/app/_components/admin/forms/form-sections-manager";

vi.mock("~/trpc/react", () => ({
  api: {
    forms: {
      createSection: {
        useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
      },
      sectionProvisioning: {
        useQuery: () => ({
          data: {
            roles: [],
            sections: [
              {
                editorRoleIds: ["editor-role"],
                id: "00000000-0000-4000-8000-000000001001",
                name: "Outreach",
                viewerRoleIds: ["viewer-role"],
              },
              {
                editorRoleIds: [],
                id: "00000000-0000-4000-8000-000000001002",
                name: "Workshops",
                viewerRoleIds: [],
              },
            ],
          },
        }),
      },
      updateSection: {
        useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
      },
    },
    useUtils: () => ({
      forms: { sectionProvisioning: { invalidate: vi.fn() } },
    }),
  },
}));

describe("FormSectionsManager", () => {
  it("renders every provisioned section with an access-editing control", () => {
    const html = renderToStaticMarkup(createElement(FormSectionsManager));

    expect(html).toContain("Outreach");
    expect(html).toContain("Workshops");
    expect(html).toContain("Edit access");
  });
});
