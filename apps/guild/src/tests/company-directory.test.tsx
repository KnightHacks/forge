import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { CompanyDirectory } from "../app/_components/company-directory";

type Company = RouterOutputs["guild"]["listPublicCompanies"][number];

const company = {
  currentMembers: 3,
  displayName: "AMD",
  domain: "amd.com",
  formerMembers: 2,
  id: "00000000-0000-4000-8000-000000000123",
  logoUrl: null,
  unconfirmedMembers: 1,
} satisfies Company;
const companies = [company];

describe("Guild company directory", () => {
  it("links approved company summaries with public relationship counts", () => {
    const html = renderToStaticMarkup(
      createElement(CompanyDirectory, { companies }),
    );

    expect(html).toContain(
      'href="/companies/00000000-0000-4000-8000-000000000123"',
    );
    expect(html).toContain(">AMD<");
    expect(html).toContain("amd.com");
    expect(html).toContain("cdn.simpleicons.org/amd");
    expect(html).toContain("6 Guild members");
    expect(html).toContain("3 current");
  });

  it("prefers an officer-managed company image", () => {
    const html = renderToStaticMarkup(
      createElement(CompanyDirectory, {
        companies: [
          {
            ...company,
            logoUrl: "https://objects.example.test/company.png",
          },
        ],
      }),
    );

    expect(html).toContain("https://objects.example.test/company.png");
    expect(html).not.toContain("cdn.simpleicons.org/amd");
  });

  it("provides an explanatory empty state", () => {
    const html = renderToStaticMarkup(
      createElement(CompanyDirectory, { companies: [] }),
    );

    expect(html).toContain("No companies yet");
  });
});
