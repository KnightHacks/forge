import type { Metadata } from "next";

import ClubContentPage from "../_components/club-content-page";
import JsonLd from "../_components/json-ld";
import { CLUB_ASSETS } from "../_lib/assets";
import {
  BLADE_URL,
  createBreadcrumbJsonLd,
  createPageMetadata,
  createWebPageJsonLd,
} from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "Project Launch",
  description:
    "Project Launch is Knight Hacks' spring project-building program at UCF, helping students scope, build, demo, and ship portfolio projects.",
  path: "/project-launch",
});

const jsonLd = [
  createWebPageJsonLd({
    path: "/project-launch",
    name: "Project Launch",
    description:
      "Knight Hacks' spring project program where UCF students build real projects with lab hours, checkpoints, mentorship, and an end-of-semester expo.",
  }),
  createBreadcrumbJsonLd([
    { name: "Knight Hacks", path: "/" },
    { name: "Project Launch", path: "/project-launch" },
  ]),
];

export default function ProjectLaunchPage() {
  return (
    <>
      <ClubContentPage
        eyebrow="Spring program"
        title="Take a project from idea to demo."
        headlineReveal="headline-ladder"
        description="Project Launch gives curious builders a spring structure for scoping, building, debugging, and presenting a real project before finals."
        image={{
          src: CLUB_ASSETS.projectLaunchExpoFloor,
          alt: "Knight Hacks members sharing project demos on the expo floor",
        }}
        primaryAction={{
          href: BLADE_URL,
          label: "Watch Blade",
        }}
        secondaryAction={{
          href: "/resources/how-to-build-a-hackathon-project",
          label: "Project Guide",
          variant: "dark",
        }}
        stats={[
          {
            value: "Spring",
            label: "Program season from late January to finals",
          },
          {
            value: "24",
            label: "Projects demoed at the Spring 2025 expo",
          },
          {
            value: "Expo",
            label: "Final demo moment for builders",
          },
        ]}
        sections={[
          {
            eyebrow: "Structure",
            title: "Lab hours keep projects moving.",
            body: "Project Launch creates a recurring workspace where teams can brainstorm, debug, code, and get mentor feedback before the end-of-semester expo.",
            bullets: [
              "Scope a realistic project",
              "Build with a team or focused solo plan",
              "Use lab hours for debugging and planning",
              "Prepare for a public demo",
            ],
          },
          {
            eyebrow: "Outcome",
            title: "A shipped project is the point.",
            body: "The program is designed for students who want more than a workshop exercise. By the end, builders should have something they can explain, demo, and keep improving.",
            bullets: [
              "Portfolio-ready project work",
              "Practice with technical tradeoffs",
              "Demo storytelling and judge-style feedback",
              "A stronger base for hackathons and interviews",
            ],
          },
          {
            eyebrow: "Community",
            title: "Building is easier with witnesses.",
            body: "Knight Hacks uses Project Launch to turn isolated ideas into shared momentum. The social pressure is useful: people see what others are making, ask for help, and keep showing up.",
            bullets: [
              "Find teammates through club channels",
              "Get mentorship from experienced members",
              "Learn from other teams' project choices",
              "Celebrate the finished work at expo",
            ],
          },
        ]}
        finalCta={{
          eyebrow: "Build season",
          title: "Start with a small scope.",
          body: "The best Project Launch ideas are clear, demoable, and useful. Bring one problem, one user, and one feature you can ship first.",
          actions: [
            { href: "/resources", label: "Read Resources" },
            { href: "/events", label: "Find Lab Hours", variant: "dark" },
          ],
        }}
      />
      <JsonLd data={jsonLd} />
    </>
  );
}
