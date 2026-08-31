"use client";

import { useState } from "react";

const questions = [
  {
    question: "What is a Hackathon?",
    answer: (
      <>
        A hackathon is a weekend-long event where students come together to
        learn the latest technologies and build innovative projects. These
        projects can range from involving web or mobile development to building
        a hardware project, or anything in between. Hackathons are a great way
        to learn new skills, meet new people, and have fun! Additionally,
        throughout the weekend we will be hosting workshops, fun social events,
        networking opportunities with sponsors, free food &amp; swag, and so
        much more.
      </>
    ),
  },
  {
    question: "How long is Knight Hacks?",
    answer: (
      <>
        Knighthacks is a 36-hour hackathon, beginning at 5pm on Friday (check-in
        runs from 5-8pm, with the opening ceremony starting at 8pm) and ending
        at 6pm on Sunday. We encourage you to work on your project for as long
        as you can during this time.
      </>
    ),
  },
  {
    question: "Who can attend?",
    answer: (
      <>
        If you&apos;re currently a college student or have graduated in the past
        year, you&apos;re more than welcome to attend!
      </>
    ),
  },
  {
    question: "How much experience do I need?",
    answer: (
      <>
        None! We welcome students from all academic backgrounds and skill
        levels, so don&apos;t be afraid to come and join us! We&apos;ll have
        introductory workshops for you to learn new skills, industry mentors to
        help you out, and great tools to build your projects. Whether
        you&apos;ve never coded before or have lots of experience, there&apos;s
        a place for you at KnightHacks!
      </>
    ),
  },
  {
    question: "Do I need to have a team?",
    answer: (
      <>
        Not at all! You can be a lone wolf, come with a team (no more than four
        people), or join some teams at KnightHacks. We&apos;ll also have team
        building activities to help you find the right teammates!
      </>
    ),
  },
  {
    question: "Will there be transportation provided or travel reimbursements?",
    answer: (
      <>
        Good news! We are planning on sending busses to Florida International
        University (FIU), the University of Florida (UF), and the University of
        South Florida (USF). More information will be provided closer to the
        event to you via email if you are registered, and you attend one of
        these universities. Unfortunately due to budget constraints this year,
        we will not be able to provide travel reimbursements beyond this. We
        apologize for the inconvenience.
      </>
    ),
  },
  {
    question: "How much does it cost?",
    answer: (
      <>
        Nothing! That&apos;s right, KnightHacks is entirely free for all
        attendees to participate. All you need to worry about is learning new
        skills, developing cool projects, and having fun!
      </>
    ),
  },
  {
    question: "What is the Horse Plinko Cyber Challenge?",
    answer: (
      <>
        Horse Plinko Cyber Challenge (HPCC) is a beginner-oriented cybersecurity
        competition run by Hack@UCF. HPCC is a blue team competition, where the
        blue team is given a real world scenario that puts them in charge of
        securing a fictitious company&apos;s computers.
      </>
    ),
  },
  {
    question: "Can I participate in both the Hackathon and Horse Plinko?",
    answer: (
      <>
        Absolutely! Knighthacks encourages attendees to explore and try new
        things.
      </>
    ),
  },
] as const;

export function Faq() {
  const [expanded, setExpanded] = useState(0);

  return (
    <div className="faq-list">
      {questions.map(({ question, answer }, index) => {
        const isExpanded = expanded === index;
        const answerId = `faq-answer-${index}`;

        return (
          <section className="faq-item" key={question}>
            <h3>
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={answerId}
                onClick={() => setExpanded(isExpanded ? -1 : index)}
              >
                <span aria-hidden="true" className="faq-arrow">
                  ›
                </span>
                {question}
              </button>
            </h3>
            {isExpanded ? (
              <div className="faq-answer" id={answerId}>
                <p>{answer}</p>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
