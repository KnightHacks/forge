import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormCallbackCatalog } from "~/app/_components/admin/forms/form-callback-catalog";

const callbacks = [
  {
    canConfigure: false,
    description: "Assign a fixed allowlisted Discord role after submission.",
    id: "discord.assign-role",
    label: "Discord role assignment",
    requiredAccess: "Assign Roles permission",
  },
  {
    canConfigure: true,
    description: "Notify the recruiting team about a completed response.",
    id: "recruiting.notify",
    label: "Recruiting notification",
    requiredAccess: "Recruiting callback role",
  },
];

describe("FormCallbackCatalog", () => {
  it("TC-029 keeps every registered callback discoverable and explains disabled access", () => {
    const html = renderToStaticMarkup(
      createElement(FormCallbackCatalog, { callbacks }),
    );

    expect(html).toContain('aria-label="Callbacks and automations"');
    expect(html).toContain("Discord role assignment");
    expect(html).toContain(
      "Assign a fixed allowlisted Discord role after submission.",
    );
    expect(html).toContain("Recruiting notification");
    expect(html).toContain("Assign Roles permission");
    expect(html).toMatch(/disabled(?:="")?/);
    expect(html).toContain('aria-disabled="true"');
  });

  it("does not describe disabled callbacks as unavailable or hide whom to contact", () => {
    const html = renderToStaticMarkup(
      createElement(FormCallbackCatalog, { callbacks }),
    );

    expect(html).toContain("Required access");
    expect(html).not.toContain("Callback unavailable");
    expect(html).not.toContain("No callbacks available");
  });
});
