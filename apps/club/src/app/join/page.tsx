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
  title: "Join Knight Hacks",
  description:
    "Join Knight Hacks at UCF through Blade, Discord, event reminders, workshops, mentorship, Project Launch, socials, and the annual hackathon.",
  path: "/join",
});

const jsonLd = [
  createWebPageJsonLd({
    path: "/join",
    name: "Join Knight Hacks",
    description:
      "How UCF students can join Knight Hacks, create a Blade profile, enter Discord, follow events, and get involved in workshops and programs.",
  }),
  createBreadcrumbJsonLd([
    { name: "Knight Hacks", path: "/" },
    { name: "Join", path: "/join" },
  ]),
];

export default function JoinPage() {
  return (
    <>
      <ClubContentPage
        eyebrow="Start here"
        title="Join the UCF builder community."
        headlineReveal="headline-wipe"
        description="Knight Hacks membership starts with a Blade profile and the Discord community. From there, students can follow events, attend workshops, join programs, meet teammates, and build toward hackathon weekend."
        image={{
          src: CLUB_ASSETS.clubMembersGathering,
          alt: "Knight Hacks members gathered at a club event",
        }}
        primaryAction={{
          href: BLADE_URL,
          label: "Create Blade Profile",
        }}
        secondaryAction={{
          href: DISCORD_URL,
          label: "Join Discord",
          variant: "dark",
        }}
        stats={[
          {
            value: "700+",
            label: "Annual Knight Hacks club members at UCF",
          },
          {
            value: "$0",
            label: "Most workshops, socials, and meetings are free",
          },
          {
            value: "2015",
            label: "Founded as a student-run organization",
          },
        ]}
        sections={[
          {
            eyebrow: "Member profile",
            title: "Create a home base on Blade.",
            body: "Blade is the Knight Hacks web app for member profiles, event notifications, hackathon applications, sponsor forms, and club workflows. A profile makes it easier to keep your activity connected across the year.",
            bullets: [
              "Create or update your member profile",
              "Use event notifications to keep up with club activity",
              "Return for hackathon and program applications when they open",
              "Keep your Knight Hacks identity in one place",
            ],
          },
          {
            eyebrow: "Community",
            title: "Join Discord before your first event.",
            body: "The Discord is where announcements, event reminders, help channels, team formation, and informal community all meet. It is the fastest way for a new member to find people before walking into a room.",
            bullets: [
              "Follow announcements and event reminders",
              "Ask beginner questions without waiting for a meeting",
              "Find workshop friends, mentors, and teammates",
              "Stay connected between in-person events",
            ],
          },
          {
            eyebrow: "Membership",
            title: "Show up free, then go deeper if you want.",
            body: "Most Knight Hacks activities are free. Optional dues unlock extras such as the annual club shirt, exclusive mentorship and project-program access, travel hackathon opportunities, and electoral participation.",
            bullets: [
              "Attend GBMs, workshops, socials, and operations meetings",
              "Apply for Kickstart Mentorship in the fall",
              "Build through Project Launch in the spring",
              "Watch for team applications and leadership openings",
            ],
          },
        ]}
        finalCta={{
          eyebrow: "Next step",
          title: "Start with one event.",
          body: "Create your profile, join the Discord, and pick the next workshop, GBM, or social from the club calendar.",
          actions: [
            { href: "/events", label: "View Events" },
            { href: "/resources", label: "Read Resources", variant: "dark" },
          ],
        }}
      />
      <JsonLd data={jsonLd} />
    </>
  );
}
