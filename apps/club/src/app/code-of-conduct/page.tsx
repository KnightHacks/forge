import type { Metadata } from "next";

import ClubContentPage from "../_components/club-content-page";
import JsonLd from "../_components/json-ld";
import {
  createBreadcrumbJsonLd,
  createPageMetadata,
  createWebPageJsonLd,
  PRESIDENT_EMAIL,
} from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "Code of Conduct",
  description:
    "Knight Hacks' Code of Conduct sets expectations for safe, inclusive, respectful behavior across club events, workshops, hackathons, online platforms, and community spaces.",
  path: "/code-of-conduct",
});

const jsonLd = [
  createWebPageJsonLd({
    path: "/code-of-conduct",
    name: "Knight Hacks Code of Conduct",
    description:
      "A public summary of behavior expectations, inclusivity commitments, and reporting paths for Knight Hacks events and community spaces.",
  }),
  createBreadcrumbJsonLd([
    { name: "Knight Hacks", path: "/" },
    { name: "Code of Conduct", path: "/code-of-conduct" },
  ]),
];

export default function CodeOfConductPage() {
  return (
    <>
      <ClubContentPage
        eyebrow="Community standards"
        title="A safe place to learn, build, and belong."
        headlineReveal="headline-flicker"
        description="Knight Hacks expects every member, hacker, mentor, volunteer, sponsor, and organizer to help create a respectful environment across workshops, programs, hackathons, socials, and online spaces."
        image={{
          src: "/community.jpg",
          alt: "Knight Hacks community members at an event",
        }}
        primaryAction={{
          href: `mailto:${PRESIDENT_EMAIL}`,
          label: "Contact President",
        }}
        secondaryAction={{
          href: "/join",
          label: "Join The Community",
          variant: "dark",
        }}
        stats={[
          {
            value: "2025",
            label: "Current public policy effective year",
          },
          {
            value: "All",
            label: "Members, hackers, mentors, sponsors, and organizers",
          },
          {
            value: "UCF",
            label: "Aligned with university conduct expectations",
          },
        ]}
        sections={[
          {
            eyebrow: "Expected behavior",
            title: "Respect is the baseline.",
            body: "Members are expected to use welcoming language, treat others with respect, collaborate generously, practice inclusivity, and support the learning of newcomers and experienced builders alike.",
            bullets: [
              "Use inclusive and professional language",
              "Credit and respect the ideas of others",
              "Help newer students ask questions and grow",
              "Keep workshops and hackathons collaborative",
            ],
          },
          {
            eyebrow: "Unacceptable behavior",
            title:
              "Harassment, discrimination, and intimidation are not welcome.",
            body: "Knight Hacks prohibits harassment, discrimination, sexual harassment, bullying, threats, intimidation, hate speech, privacy violations, disruptive conduct, hazing, cheating, retaliation, and unsafe behavior.",
            bullets: [
              "Rules apply in person and online",
              "Reports are handled seriously and confidentially",
              "Urgent safety issues may be escalated immediately",
              "Retaliation against reporters is prohibited",
            ],
          },
          {
            eyebrow: "Reporting",
            title: "Concerns should be reported early.",
            body: "Students may contact organizers, officers, the president, UCF resources, or MLH contacts for hackathon-specific issues. Knight Hacks is responsible for responding fairly, promptly, and in alignment with UCF and MLH expectations.",
            bullets: [
              "Email the executive team or president",
              "Approach organizers during events",
              "Use university resources when appropriate",
              "Contact MLH for hackathon incidents",
            ],
          },
        ]}
        finalCta={{
          eyebrow: "Standard",
          title: "Protect the room.",
          body: "Knight Hacks works because students can take risks, ask questions, and build in public. The Code of Conduct exists to protect that environment.",
          actions: [
            { href: `mailto:${PRESIDENT_EMAIL}`, label: "Report A Concern" },
            { href: "/about", label: "About Knight Hacks", variant: "dark" },
          ],
        }}
      />
      <JsonLd data={jsonLd} />
    </>
  );
}
