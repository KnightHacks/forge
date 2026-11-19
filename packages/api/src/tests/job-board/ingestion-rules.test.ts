import { describe, expect, it } from "vitest";

import type { CareerJobListing } from "@forge/validators";
import {
  careerJobSourceSnapshotSchema,
  companyKeySchema,
} from "@forge/validators";

import { findUsCity } from "../../utils/career/us-cities";
import {
  classifyCategory,
  classifyTrack,
} from "../../utils/job-board/classify";
import { prepareListing } from "../../utils/job-board/listing";
import {
  isForeignLocation,
  parseLocation,
} from "../../utils/job-board/locations";
import {
  cleanApplyUrl,
  companyKey,
  identityHash,
  identityKeys,
  preferredApplyUrl,
} from "../../utils/job-board/normalize";

const source = { provider: "github", boardKey: "simplify/internships" };
const SOURCE_KEY = 'source:["github","simplify/internships","row-1"]';

function keysFor(applyUrl: string) {
  return identityKeys({ ...source, applyUrl, externalId: "row-1" });
}

function listing(overrides: Partial<CareerJobListing> = {}): CareerJobListing {
  return {
    externalId: "row-1",
    companyLabel: "Acme, Inc.",
    title: "Software Engineer Intern",
    applyUrl: "https://boards.greenhouse.io/acme/jobs/123",
    locationTexts: ["Orlando, FL"],
    sourceUrl: "https://github.com/simplify/internships",
    sourceData: {},
    ...overrides,
  };
}

describe("job identity", () => {
  it("TC-001 builds ATS keys first, then URL, then source", () => {
    expect(keysFor("https://boards.greenhouse.io/acme/jobs/123")).toEqual([
      "ats:greenhouse:123",
      "url:https://boards.greenhouse.io/acme/jobs/123",
      SOURCE_KEY,
    ]);
    expect(keysFor("https://acme.com/careers?gh_jid=987")[0]).toBe(
      "ats:greenhouse:987",
    );
    expect(keysFor("https://jobs.lever.co/acme/AB-12")[0]).toBe(
      "ats:lever:ab-12",
    );
    expect(keysFor("https://jobs.ashbyhq.com/acme/Uuid-1")[0]).toBe(
      "ats:ashby:uuid-1",
    );
    expect(
      keysFor(
        "https://nvidia.wd5.myworkdayjobs.com/en-US/External/job/US-CA/Software-Intern_JR1234",
      )[0],
    ).toBe("ats:workday:nvidia:jr1234");
  });

  it("never uses an aggregator URL as an identity", () => {
    expect(keysFor("https://jobright.ai/jobs/info/abc")).toEqual([SOURCE_KEY]);
  });

  it("never uses a shared careers landing page as an identity", () => {
    for (const landing of [
      "https://acme.com/careers",
      "https://acme.com/careers?year=2026",
      "https://acme.wd1.myworkdayjobs.com/en-US/Careers",
    ]) {
      expect(keysFor(landing)).toEqual([SOURCE_KEY]);
    }
    expect(keysFor("https://acme.com/careers?jobId=42")[0]).toBe(
      "url:https://acme.com/careers?jobId=42",
    );
  });

  it("keeps source key parts apart when they contain colons", () => {
    const key = (boardKey: string, externalId: string) =>
      identityKeys({
        provider: "github",
        boardKey,
        externalId,
        applyUrl: "https://acme.com/careers",
      }).at(-1);
    expect(key("acme:engineering", "17")).not.toBe(
      key("acme", "engineering:17"),
    );
  });

  it("TC-002 strips tracking params, fragments, and a trailing /apply", () => {
    expect(
      cleanApplyUrl(
        "https://Jobs.Lever.co//acme/ab-12/apply/?utm_source=x&ref=gh&lever-source=y#top",
      ),
    ).toBe("https://jobs.lever.co/acme/ab-12?lever-source=y");
    expect(cleanApplyUrl("javascript:alert(1)")).toBeNull();
    expect(cleanApplyUrl("https://user:pw@acme.com/job")).toBeNull();
  });

  it("prefers an employer link over an aggregator copy", () => {
    const employer = "https://acme.com/jobs/1";
    const aggregator = "https://simplify.jobs/p/1";
    expect(preferredApplyUrl(aggregator, employer)).toBe(employer);
    expect(preferredApplyUrl(employer, aggregator)).toBe(employer);
  });

  it("builds company keys that company filters accept", () => {
    const long = `${"a".repeat(119)} corp`;
    expect(companyKeySchema.safeParse(companyKey(long)).success).toBe(true);
    expect(companyKey("株式会社")).toBe("");
  });

  it("hashes keys as SHA-256 hex of UTF-8", () => {
    expect(identityHash("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("track and category", () => {
  it("TC-003 to TC-005 classifies track from title unless the source sets it", () => {
    expect(classifyTrack("Software Engineer Intern")).toBe("internship");
    expect(classifyTrack("Co-op, Firmware")).toBe("internship");
    expect(classifyTrack("New Grad SWE")).toBe("new_grad");
    expect(classifyTrack("Software Engineer I")).toBe("new_grad");
    expect(classifyTrack("Senior Software Engineer")).toBeNull();
    expect(classifyTrack("Software Engineer")).toBeNull();
    expect(classifyTrack("Senior Software Engineer", "new_grad")).toBe(
      "new_grad",
    );
  });

  it("TC-006 classifies role categories like CS Job Poster", () => {
    expect(classifyCategory("Software Engineer Intern")).toBe("swe");
    expect(classifyCategory("Machine Learning Intern")).toBe("data_ai");
    expect(classifyCategory("Product Manager Intern")).toBe("pm");
    expect(classifyCategory("Quantitative Trader Intern")).toBe("quant");
    expect(classifyCategory("UX Design Intern")).toBe("design");
    expect(classifyCategory("Security Analyst Intern")).toBe("it_security");
    expect(classifyCategory("Data Analyst Intern")).toBe("analyst");
    expect(classifyCategory("FPGA Engineer Intern")).toBe("hardware");
    expect(classifyCategory("Software Security Engineer")).toBe("swe");
    expect(
      classifyCategory("Systems Engineer Intern", "Work on FPGA boards"),
    ).toBe("hardware");
    expect(classifyCategory("Summer Intern", "It is a great team")).toBe(
      "other",
    );
  });
});

describe("locations", () => {
  const orlando = findUsCity("Orlando", "FL");
  const seattle = findUsCity("Seattle", "WA");
  const redmond = findUsCity("Redmond", "WA");

  it("TC-007 parses city, state, U.S. remote, and unknown", () => {
    expect(orlando?.key).toBe("12-53000");
    expect(parseLocation("Orlando, FL")).toMatchObject({
      kind: "city",
      cityKey: orlando?.key,
      state: "FL",
    });
    expect(parseLocation("Seattle, Washington, United States")).toMatchObject({
      kind: "city",
      cityKey: seattle?.key,
    });
    expect(parseLocation("United States, Washington, Redmond")).toMatchObject({
      kind: "city",
      cityKey: redmond?.key,
    });
    expect(parseLocation("NYC")).toMatchObject({ kind: "city", state: "NY" });
    expect(parseLocation("Florida")).toMatchObject({
      kind: "state",
      state: "FL",
    });
    expect(parseLocation("Nowhereville, TX")).toMatchObject({
      kind: "state",
      state: "TX",
    });
    expect(parseLocation("Remote - US")).toMatchObject({ kind: "remote_us" });
    expect(parseLocation("Remote - join us")).toMatchObject({
      kind: "unknown",
    });
    expect(parseLocation("Remote")).toMatchObject({
      kind: "unknown",
      sourceText: "Remote",
    });
    expect(parseLocation("Multiple Locations")).toMatchObject({
      kind: "unknown",
    });
  });

  it("TC-008 rejects all-foreign listings and keeps mixed ones", () => {
    expect(
      prepareListing(listing({ locationTexts: ["London, UK"] }), source),
    ).toEqual({
      ok: false,
      reason: "non_us",
    });
    const mixed = prepareListing(
      listing({ locationTexts: ["London, UK / Austin, TX"] }),
      source,
    );
    expect(mixed.ok && mixed.listing.locations).toEqual([
      expect.objectContaining({
        kind: "city",
        state: "TX",
        sourceText: "Austin, TX",
      }),
    ]);
    expect(parseLocation("Albuquerque, New Mexico")).toMatchObject({
      kind: "city",
    });
  });

  it("keeps U.S. places that look foreign", () => {
    for (const text of [
      "ON-SITE - Austin, TX",
      "Austin, TX (ON SITE)",
      "London, KY",
      "London, ky",
      "Mexico, MO",
      "Austin, TX or Toronto, ON",
    ]) {
      expect(isForeignLocation(text)).toBe(false);
    }
    for (const text of ["Toronto, ON", "London, UK", "Remote - Canada"]) {
      expect(isForeignLocation(text)).toBe(true);
    }
  });
});

describe("prepared listing", () => {
  it("rejects listings that are not student roles", () => {
    expect(
      prepareListing(listing({ title: "Staff Engineer" }), source),
    ).toEqual({
      ok: false,
      reason: "not_student_role",
    });
  });

  it("rejects a company label with nothing to group by", () => {
    expect(
      prepareListing(listing({ companyLabel: "株式会社" }), source),
    ).toEqual({ ok: false, reason: "invalid_listing" });
  });

  it("keeps a listing with no locations", () => {
    const prepared = prepareListing(listing({ locationTexts: [] }), source);
    expect(prepared.ok && prepared.listing.locations).toEqual([]);
  });

  it("normalizes the company key for grouping", () => {
    const prepared = prepareListing(listing(), source);
    expect(prepared.ok && prepared.listing.companyKey).toBe("acme inc");
  });

  it("TC-NEG-003 rejects invalid snapshot input", () => {
    const snapshot = {
      source: { ...source, label: "Simplify" },
      fetchedAt: new Date(),
      complete: true,
      inventory: "rolling",
      listings: [listing()],
    };
    expect(careerJobSourceSnapshotSchema.safeParse(snapshot).success).toBe(
      true,
    );
    for (const bad of [
      listing({ applyUrl: "ftp://acme.com/job" }),
      listing({ title: "   " }),
    ]) {
      expect(
        careerJobSourceSnapshotSchema.safeParse({
          ...snapshot,
          listings: [bad],
        }).success,
      ).toBe(false);
    }
  });
});
