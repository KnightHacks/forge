import { CLUB_ASSETS } from "../_lib/assets";

export interface ResourceSection {
  title: string;
  body: string;
  bullets?: string[];
}

export interface ResourceArticle {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  audience: string;
  readTime: string;
  image: string;
  sections: ResourceSection[];
}

export const RESOURCE_ARTICLES = [
  {
    slug: "first-hackathon-guide",
    title: "First Hackathon Guide for UCF Students",
    description:
      "A beginner-friendly guide to joining your first hackathon, forming a team, choosing an idea, building quickly, and submitting a demo.",
    eyebrow: "Hackathon prep",
    audience: "First-time hackers",
    readTime: "7 min",
    image: CLUB_ASSETS.hackathonMainRoom,
    sections: [
      {
        title: "A hackathon is a short build sprint, not a test.",
        body: "The goal is to learn, build, meet people, and ship something small enough to explain. You do not need to be the strongest coder in the room to have a useful weekend.",
        bullets: [
          "Show up with curiosity before expertise",
          "Use workshops and mentors early",
          "Pick a team that communicates clearly",
          "Scope something you can demo in one minute",
        ],
      },
      {
        title: "Start with the user, then the feature list.",
        body: "Good first projects solve one visible problem for one clear audience. Decide who you are helping, what pain you are reducing, and what the simplest working version looks like.",
        bullets: [
          "Problem: what is annoying, slow, confusing, or inaccessible",
          "User: who experiences that problem",
          "Solution: what can your team build this weekend",
          "Demo: what one moment proves it works",
        ],
      },
      {
        title: "Protect your Sunday demo.",
        body: "Most first-time teams lose time by chasing too many features. Freeze your core idea early, keep a working version alive, and use the final hours for polish, Devpost, and presentation practice.",
        bullets: [
          "Submit before the deadline",
          "Record screenshots or a backup demo",
          "Explain what each teammate contributed",
          "Thank mentors and sponsors who helped",
        ],
      },
    ],
  },
  {
    slug: "how-to-build-a-hackathon-project",
    title: "How to Build a Hackathon Project",
    description:
      "A practical framework for turning a hackathon idea into a small, demoable project with clear scope, ownership, and presentation.",
    eyebrow: "Build plan",
    audience: "Hackathon teams",
    readTime: "8 min",
    image: CLUB_ASSETS.projectLaunchPresentations,
    sections: [
      {
        title: "Write the one-sentence project before writing code.",
        body: "If the team cannot describe the project in one sentence, the scope is probably too loose. A strong sentence names the user, the problem, and the outcome.",
        bullets: [
          "For UCF students who need...",
          "We are building...",
          "So they can...",
          "The demo proves this by...",
        ],
      },
      {
        title: "Split the build into a demo spine and stretch goals.",
        body: "The demo spine is the smallest path that makes the project real. Stretch goals are allowed only after the spine works end to end.",
        bullets: [
          "Data or input",
          "Core action",
          "Result screen",
          "One polished demo path",
        ],
      },
      {
        title: "Assign ownership by surface area.",
        body: "Hackathon teams move faster when each person owns a clear surface: frontend, backend, design, data, hardware, pitch, or integration. Avoid five people editing the same file for the first six hours.",
        bullets: [
          "Use branches or clear handoffs",
          "Keep a working main branch",
          "Agree on a fallback if an API fails",
          "Practice the demo before judging",
        ],
      },
    ],
  },
  {
    slug: "git-github-for-hackathons",
    title: "Git and GitHub for Hackathons",
    description:
      "A simple Git workflow for student hackathon teams that need to collaborate without breaking the project.",
    eyebrow: "Dev workflow",
    audience: "New project teams",
    readTime: "6 min",
    image: CLUB_ASSETS.gameDevKnightsTabling,
    sections: [
      {
        title: "Keep the workflow boring.",
        body: "The best hackathon Git workflow is the one your whole team understands. Use small branches, clear commit messages, and frequent pulls before the project gets complicated.",
        bullets: [
          "Clone the repo once",
          "Create a branch for each feature",
          "Commit small working steps",
          "Open a pull request or merge intentionally",
        ],
      },
      {
        title: "Protect the working demo.",
        body: "Your default branch should always be close to demoable. If a feature is risky, isolate it until the team agrees it is safe to merge.",
        bullets: [
          "Do not rewrite shared history during the event",
          "Push often so work is not trapped on one laptop",
          "Use issues or a shared note for tasks",
          "Tag a final submission version if possible",
        ],
      },
      {
        title: "Use GitHub as project evidence.",
        body: "A clean repository helps judges, mentors, sponsors, and future interviewers understand what you built. Add a README before judging starts.",
        bullets: [
          "Project name and one-sentence description",
          "Screenshots or demo link",
          "Tech stack and setup steps",
          "Team members and credits",
        ],
      },
    ],
  },
  {
    slug: "devpost-demo-checklist",
    title: "Devpost Demo Checklist",
    description:
      "A checklist for submitting a hackathon project with a clear story, complete Devpost page, and demo that judges can understand quickly.",
    eyebrow: "Submission",
    audience: "Hackathon presenters",
    readTime: "5 min",
    image: CLUB_ASSETS.projectCollaboration,
    sections: [
      {
        title: "Lead with what changed for the user.",
        body: "Judges do not need every implementation detail first. They need to know what problem you chose, who it affects, and how your project makes the situation better.",
        bullets: ["Problem", "Audience", "Solution", "Live demo path"],
      },
      {
        title: "Make the Devpost page skimmable.",
        body: "Your project page should work even if a judge reads it quickly. Use headings, screenshots, a short demo video, and a clear explanation of what was built during the event.",
        bullets: [
          "Short project summary",
          "What it does",
          "How it was built",
          "Challenges and what you learned",
        ],
      },
      {
        title: "Practice the one-minute demo.",
        body: "A concise demo is usually stronger than a rushed feature tour. Show the core workflow, explain the hardest technical part, and end with what you would build next.",
        bullets: [
          "Open with one sentence",
          "Show the core interaction",
          "Mention the technical hook",
          "Finish with impact and next steps",
        ],
      },
    ],
  },
  {
    slug: "how-to-start-a-cs-club",
    title: "How to Start a Computer Science Club",
    description:
      "A student-organization playbook for starting a computer science club, planning meetings, recruiting members, and building useful programs.",
    eyebrow: "Club building",
    audience: "Student leaders",
    readTime: "9 min",
    image: CLUB_ASSETS.clubCommunityEvent,
    sections: [
      {
        title: "Do not start with a logo. Start with a recurring room.",
        body: "A club becomes real when people know when and where to show up. Pick a recurring meeting rhythm, a simple calendar, and a first event that helps people meet each other.",
        bullets: [
          "Choose a predictable meeting cadence",
          "Publish the next event clearly",
          "Create one group chat or Discord",
          "Make the first meeting beginner-friendly",
        ],
      },
      {
        title: "Build programs around repeated student needs.",
        body: "The strongest CS clubs are not only announcement channels. They help students learn, build, find teammates, meet mentors, and connect with industry.",
        bullets: [
          "Beginner coding workshops",
          "Mentorship groups",
          "Project nights",
          "Sponsor or alumni sessions",
        ],
      },
      {
        title: "Document everything that should outlive one officer.",
        body: "Student organizations churn every year. Keep handoff docs, sponsor notes, event checklists, design assets, and public pages current so the club gets stronger instead of restarting.",
        bullets: [
          "Officer and team responsibilities",
          "Event planning checklists",
          "Sponsor outreach templates",
          "Public archive of projects and events",
        ],
      },
    ],
  },
  {
    slug: "beginner-web-app-workshop",
    title: "Beginner Web App Workshop Outline",
    description:
      "A beginner workshop outline for helping students start a web app, understand client and server structure, and ship a small feature.",
    eyebrow: "Workshop outline",
    audience: "Workshop hosts",
    readTime: "6 min",
    image: CLUB_ASSETS.memberNetworkingSession,
    sections: [
      {
        title: "Start from the shape of a web app.",
        body: "Before installing tools, explain the basic parts: a page the user sees, state the app remembers, an action the user takes, and an optional server route or database call.",
        bullets: ["Page", "State", "Action", "Result"],
      },
      {
        title: "Give students a working local project fast.",
        body: "A good beginner workshop gets to a running app early. Once students can see changes in the browser, the abstractions become less intimidating.",
        bullets: [
          "Create the app",
          "Run the dev server",
          "Edit a component",
          "Add one interaction",
        ],
      },
      {
        title: "End with a tiny extension challenge.",
        body: "The final exercise should be small enough for beginners but open enough for faster students to customize. The point is confidence, not maximum feature count.",
        bullets: [
          "Change the data model",
          "Add a new button or route",
          "Improve styling",
          "Explain the change to a partner",
        ],
      },
    ],
  },
] as const satisfies readonly ResourceArticle[];

export function getResourceArticle(slug: string) {
  return RESOURCE_ARTICLES.find((article) => article.slug === slug);
}
