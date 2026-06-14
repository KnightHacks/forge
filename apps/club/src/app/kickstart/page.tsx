import type { Metadata } from "next";

import ClubContentPage from "../_components/club-content-page";
import JsonLd from "../_components/json-ld";
import { CLUB_ASSETS } from "../_lib/assets";
import {
  BLADE_URL,
  createBreadcrumbJsonLd,
  createPageMetadata,
  createWebPageJsonLd,
  DISCORD_URL,
} from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "Kickstart Mentorship",
  description:
    "Kickstart is Knight Hacks' fall mentorship program at UCF, pairing newer technologists with mentors by interests, goals, and experience.",
  path: "/kickstart",
});

const jsonLd = [
  createWebPageJsonLd({
    path: "/kickstart",
    name: "Kickstart Mentorship",
    description:
      "Knight Hacks' fall mentorship program for UCF students building confidence, career readiness, and technical direction through small mentor groups.",
  }),
  createBreadcrumbJsonLd([
    { name: "Knight Hacks", path: "/" },
    { name: "Kickstart", path: "/kickstart" },
  ]),
];

export default function KickstartPage() {
  return (
    <>
      <ClubContentPage
        eyebrow="Fall program"
        title="Mentorship for early technologists."
        headlineReveal="headline-punch"
        description="Kickstart runs every fall during recruiting season. Knight Hacks pairs mentees and mentors by interests, goals, and prior experience so students can grow in smaller, more personal groups."
        image={{
          src: CLUB_ASSETS.kickstartWorkshopSession,
          alt: "Knight Hacks students participating in a mentorship workshop",
        }}
        primaryAction={{
          href: BLADE_URL,
          label: "Watch Blade",
        }}
        secondaryAction={{
          href: DISCORD_URL,
          label: "Join Discord",
          variant: "dark",
        }}
        stats={[
          {
            value: "Fall",
            label: "Program season during recruiting",
          },
          {
            value: "100",
            label: "Typical cohort size from recent planning",
          },
          {
            value: "3-6",
            label: "Students per mentorship group",
          },
        ]}
        sections={[
          {
            eyebrow: "Matching",
            title: "Groups are built around people, not just skill level.",
            body: "Kickstart matching considers interests, goals, academic stage, and prior knowledge so students can learn with mentors and peers who understand where they are starting.",
            bullets: [
              "Career and internship direction",
              "Technical confidence and project planning",
              "Small-group accountability",
              "Friendships that continue past the program",
            ],
          },
          {
            eyebrow: "Confidence",
            title: "The point is momentum.",
            body: "Knight Hacks' mission explicitly includes helping early technologists overcome impostor syndrome. Kickstart gives newer members a recurring space to ask questions and see progress.",
            bullets: [
              "Ask beginner questions without performing expertise",
              "Meet alumni, upperclassmen, and experienced builders",
              "Get feedback before recruiting season ramps up",
              "Build the confidence to attend bigger events",
            ],
          },
          {
            eyebrow: "Pathway",
            title: "Kickstart feeds the rest of the year.",
            body: "After Kickstart, students are better positioned to attend workshops, apply for Project Launch, contribute to teams, and show up at hackathons with a clearer direction.",
            bullets: [
              "Follow workshops that match your goals",
              "Use Project Launch to turn skills into a shipped project",
              "Apply for Knight Hacks teams when openings appear",
              "Find hackathon teammates earlier",
            ],
          },
        ]}
        finalCta={{
          eyebrow: "Applications",
          title: "Be ready when fall opens.",
          body: "Create your Blade profile now, join Discord announcements, and watch for the Kickstart application window.",
          actions: [
            { href: BLADE_URL, label: "Create Blade Profile" },
            {
              href: "/project-launch",
              label: "See Project Launch",
              variant: "dark",
            },
          ],
        }}
      />
      <JsonLd data={jsonLd} />
    </>
  );
}
