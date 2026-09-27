import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ArchiveShell } from "~/components/archive-shell";

export const metadata: Metadata = { title: "FAQ" };

const questions: readonly { question: string; answer: ReactNode }[] = [
  {
    question: "What is Knight Hacks?",
    answer:
      "Knight Hacks is the University of Central Florida's massive hackathon, where hundreds of students with different skill levels come together from around the world to experiment and create unique software or hardware projects from scratch. We empower and enable teams to make something great in only 36 hours by providing an abundance of resources like workshops, mentors, and hardware components.",
  },
  {
    question: "Who can participate?",
    answer:
      "Undergraduate and graduate students from any college or university anywhere in the world are eligible to apply to Knight Hacks, as well as those who have graduated in the past 12 months. Unfortunately, Knight Hacks 2021 cannot admit high school students or students under 18 years of age.",
  },
  {
    question: "Is Knight Hacks free?",
    answer:
      "Admission to Knight Hacks is completely free. Meals, workshops, mentorship, swag, hardware, and snacks are free for the entire event!",
  },
  {
    question: "How many people can be on a team?",
    answer:
      "You can form teams of up to 4 people. There are no restrictions for team members, so you can team up with hackers of any school, country, or experience level. Teams can be formed before or during the event.",
  },
  {
    question: "What if I am a beginner?",
    answer:
      "Knight Hacks welcomes students of all skill levels. In previous years, about half of the students have attended Knight Hacks as their first hackathon. We'll have talks, mentors and workshops to help you with your project. Hackathons can be a great place to learn new skills in a short amount of time. Just be eager to learn, and excited to meet lots of awesome people.",
  },
  {
    question: "Which track should I follow?",
    answer:
      "Beginner Track is suggested for those that have attended 0-2 hackathons before, have 0-2 personal projects, and have little to no experience using GitHub. Advanced Track is suggested for those that have attended 2+ hackathons before, have 2+ personal projects, and previous experience using GitHub.",
  },
  {
    question: "What kind of workshops, talks, and activities will there be?",
    answer:
      "Previously, we've held workshops and talks for a range of skill levels from beginner to advanced like Intro to Web Development and Virtual Reality. We've also had introductory workshops to various programming tools such as APIs, databases and platforms. Whether it's for relaxation or health, novelty or competition, our team has something exciting prepared for you!",
  },
  {
    question: "Can I start my project before the hackathon begins?",
    answer:
      "No, you cannot start working on your project before Hacking time officially begins. This will result in a disqualification of your project for judging.",
  },
  {
    question: "When registering, why are non-EDU emails preferred?",
    answer:
      "Due to restrictions and filters that .edu email providers have on self-hosted websites, it blocks you from receiving a verification email after signing up. Those who include their personal emails always receive their verification emails while those using .edu unfortunately don't. Better to be safe than sorry!",
  },
  {
    question: "What is the code of conduct for the event?",
    answer: (
      <>
        The event uses the MLH code of conduct, which can be found{" "}
        <a href="https://static.mlh.io/docs/mlh-code-of-conduct.pdf">here</a>.
      </>
    ),
  },
  {
    question: "404: Question Not Found",
    answer: (
      <>
        If your question is not listed here, please feel free to reach out to us
        at <a href="mailto:team@knighthacks.org">team@knighthacks.org</a> or
        message the Knight Hacks Facebook or Instagram pages.
      </>
    ),
  },
];

export default function FAQPage() {
  return (
    <ArchiveShell>
      <div className="my-4 flex w-full flex-col items-center justify-start md:my-12">
        <h1 className="font-sansita mb-4 mt-20 text-4xl sm:text-4xl md:text-6xl">
          FAQ
        </h1>
        <div className="archive-faq my-4 flex w-2/3 flex-col items-center">
          {questions.map(({ question, answer }) => (
            <details
              key={question}
              className="font-palanquin mb-2 w-full rounded-lg shadow-md"
            >
              <summary>
                {question}
                <span aria-hidden="true">⌄</span>
              </summary>
              <div className="text-darkblue dark:text-purewhite bg-opaque-blue rounded-b-lg px-8 py-2 text-left text-base sm:text-lg">
                {answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </ArchiveShell>
  );
}
