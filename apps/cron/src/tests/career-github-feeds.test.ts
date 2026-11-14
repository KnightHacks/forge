import { describe, expect, it, vi } from "vitest";

import {
  fetchAndParseGitHubJobFeed,
  GITHUB_JOB_FEEDS,
  parseGitHubJobFeed,
} from "../career-sources/github-feeds";

const markdownFeed = GITHUB_JOB_FEEDS.find(
  (feed) => feed.boardKey === "simplify_internships",
);
const jsonFeed = GITHUB_JOB_FEEDS.find(
  (feed) => feed.boardKey === "intern_engine",
);

if (!markdownFeed || !jsonFeed) {
  throw new Error("Missing GitHub feed fixtures.");
}

describe("Career GitHub job feeds", () => {
  it("TC-001 parses Markdown rows into schema-aligned listings", () => {
    const jobs = parseGitHubJobFeed(
      markdownFeed,
      [
        "| Company | Role | Location | Date Posted | Application |",
        "| --- | --- | --- | --- | --- |",
        "| Acme | Software Engineer Intern | Seattle, WA | 2026-10-01 | [Apply](https://jobs.example/acme/1) |",
      ].join("\n"),
    );

    expect(jobs).toEqual([
      {
        applyUrl: "https://jobs.example/acme/1",
        companyLabel: "Acme",
        externalId: "https://jobs.example/acme/1",
        locationTexts: ["Seattle, WA"],
        postedAt: new Date("2026-10-01T00:00:00.000Z"),
        sourceData: {
          Application: "[Apply](https://jobs.example/acme/1)",
          Company: "Acme",
          "Date Posted": "2026-10-01",
          Location: "Seattle, WA",
          Role: "Software Engineer Intern",
        },
        sourceUrl:
          "https://github.com/SimplifyJobs/Summer2027-Internships/blob/dev/README.md",
        title: "Software Engineer Intern",
        track: "internship",
      },
    ]);
  });

  it("TC-002 parses JSON records and preserves source fields", () => {
    const jobs = parseGitHubJobFeed(
      jsonFeed,
      JSON.stringify({
        jobs: [
          {
            company_name: "Acme",
            id: "job-42",
            location: "Remote - United States",
            posted_date: "2026-10-02",
            title: "New Grad Engineer",
            url: "https://jobs.example/acme/42",
            work_type: "Full-time",
          },
        ],
      }),
    );

    expect(jobs).toEqual([
      {
        applyUrl: "https://jobs.example/acme/42",
        companyLabel: "Acme",
        externalId: "job-42",
        locationTexts: ["Remote - United States"],
        postedAt: new Date("2026-10-02T00:00:00.000Z"),
        sourceData: {
          company_name: "Acme",
          id: "job-42",
          location: "Remote - United States",
          posted_date: "2026-10-02",
          title: "New Grad Engineer",
          url: "https://jobs.example/acme/42",
          work_type: "Full-time",
        },
        sourceUrl:
          "https://github.com/zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships/blob/main/docs/api/jobs.json",
        title: "New Grad Engineer",
        track: "internship",
      },
    ]);
  });

  it("maps a successful fetch to a complete JobSource snapshot", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          "| Company | Role | Application |\n| --- | --- | --- |\n| Acme | Engineer | https://jobs.example/1 |",
          { status: 200 },
        ),
      );

    const snapshot = await fetchAndParseGitHubJobFeed(markdownFeed, fetcher);

    expect(snapshot).toMatchObject({
      source: {
        provider: "github",
        boardKey: "simplify_internships",
        label: "Simplify internships",
      },
      complete: true,
      listings: [
        {
          companyLabel: "Acme",
          externalId: "https://jobs.example/1",
          track: "internship",
        },
      ],
    });
    expect(snapshot.fetchedAt).toBeInstanceOf(Date);
  });

  it("TC-NEG-001 surfaces HTTP failures", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("upstream unavailable", { status: 502 }));

    await expect(
      fetchAndParseGitHubJobFeed(markdownFeed, fetcher),
    ).rejects.toThrow("HTTP 502");
  });

  it("TC-NEG-001 rejects malformed source payloads", () => {
    expect(() => parseGitHubJobFeed(jsonFeed, "{")).toThrow();
    expect(() => parseGitHubJobFeed(markdownFeed, "not a job table")).toThrow(
      "no supported job table",
    );
  });

  it("TC-NEG-002 rejects rows missing required fields", () => {
    expect(() =>
      parseGitHubJobFeed(
        markdownFeed,
        [
          "| Company | Role | Location | Application |",
          "| --- | --- | --- | --- |",
          "| Acme | Software Engineer Intern | Seattle, WA | |",
        ].join("\n"),
      ),
    ).toThrow("application URL");
  });
});
