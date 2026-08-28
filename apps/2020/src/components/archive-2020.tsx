"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { AnimatedBoat } from "./animated-boat";

type Page = "home" | "about" | "sponsors" | "schedule" | "faq";

const pages: { id: Page; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "sponsors", label: "Sponsors" },
  { id: "schedule", label: "Schedule" },
  { id: "faq", label: "FAQ" },
];

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/KnightHacks",
    white: "/assets/Instagram-White.svg",
    black: "/assets/Instagram-Black.png",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/KnightHacks",
    white: "/assets/Facebook-White.svg",
    black: "/assets/Facebook-Black.png",
  },
  {
    label: "Twitter",
    href: "https://www.twitter.com/KnightHacks",
    white: "/assets/Twitter-White.svg",
    black: "/assets/Twitter-Black.png",
  },
  {
    label: "Discord",
    href: "https://discord.gg/Kv5g9vf",
    white: "/assets/Discord-White.png",
    black: "/assets/Discord-Black.png",
  },
];

const schedule = [
  {
    day: "Friday",
    events: [
      "6:30 PM - Check-In",
      "7:00 PM - Dinner",
      "8:00 PM - Check-In Ends",
      "8:30 PM - Opening Ceremonies",
      "9:30 PM - Sponsorship Fair",
      "10:30 PM - Hacking Begins",
    ],
  },
  {
    day: "Saturday",
    events: [
      "12:00 AM - Midnight Snack",
      "8:00 AM - 9:30 AM - Breakfast",
      "1:00 PM - 2:30 PM - Lunch",
      "7:00 PM - 8:30 PM - Dinner",
    ],
  },
  {
    day: "Sunday",
    events: [
      "12:00 AM - Midnight Snack",
      "7:30 AM - 8:30 AM - Breakfast",
      "8:30 AM - Submissions to Devpost",
      "10:30 AM - Hacking ends and Lunch",
      "11:00 AM - 2:00 PM - Demo Fair",
      "2:30 PM - 3:30 PM - Closing Ceremony",
    ],
  },
];

const faqs = [
  {
    title: "What is Knight Hacks?",
    description:
      "Knight Hacks is the University of Central Florida’s massive hackathon, where hundreds of students with different skill levels come together from around the world to experiment and create unique software or hardware projects from scratch. We empower and enable teams to make something great in only 36 hours by providing an abundance of resources like workshops, mentors, and hardware components.",
  },
  {
    title: "Who can participate?",
    description:
      "Undergraduate and graduate students from any college or university anywhere in the world are eligible to apply to Knight Hacks, as well as those who have graduated in the past 12 months. Unfortunately, Knight Hacks 2020 cannot admit high school students or students under 18 years of age.",
  },
  {
    title: "Is Knight Hacks Free?",
    description:
      "Admission to Knight Hacks is completely free. Meals, workshops, mentorship, swag, hardware, and snacks are free for the entire event!",
  },
  {
    title: "How many people can be on a team?",
    description:
      "You can form teams of up to 4 people. There are no restrictions for team members, so you can team up with hackers of any school, country, or experience level. Teams can be formed before or during the event.",
  },
  {
    title: "What if I am a beginner?",
    description:
      "Knight Hacks welcomes students of all skill levels. In previous years, about half of the students have attended Knight Hacks as their first hackathon. We’ll have talks, mentors and workshops to help you with your project. Hackathons can be a great place to learn new skills in a short amount of time. Just be eager to learn, and excited to meet lots of awesome people.",
  },
  {
    title: "What kind of workshops, talks, and activities will there be?",
    description:
      "Previously, we’ve held workshops and talks for a range of skill levels from beginner to advanced like Intro to Web Development and Virtual Reality. We’ve also had introductory workshops to various programming tools such as APIs, databases and platforms. Whether it’s for relaxation or health, novelty or competition, our team has something exciting prepared for you!",
  },
  {
    title: "404: Question Not Found",
    description:
      "If your question is not listed here, please feel free to reach out to us at team@knighthacks.org or message the Knight Hacks Facebook or Instagram pages.",
  },
  {
    title: "What is the code of conduct for the event?",
    description: "The event uses the MLH code of conduct.",
    href: "https://static.mlh.io/docs/mlh-code-of-conduct.pdf",
  },
];

const sponsorBoats = [
  ["Disney-Boat.png", "Disney", "boat-one sm-boat"],
  ["Google-Cloud-Boat.png", "Google Cloud", "boat-two sm-boat"],
  ["Microsoft-Boat.png", "Microsoft", "boat-three sm-boat"],
  ["FB-Boat.png", "Facebook", "boat-one sm-boat"],
  ["PWC-Boat.png", "PwC", "boat-two lg-boat"],
  ["Capital-One-Boat.png", "Capital One", "boat-three md-boat"],
  ["EA-Boat.png", "EA", "boat-one sm-boat"],
  ["NSIN-Boat.png", "NSIN", "boat-two sm-boat"],
  ["Oracle-Boat.png", "Oracle", "boat-three lg-boat"],
  ["RBC-Boat.png", "RBC", "boat-one md-boat"],
] as const;

const mobileSponsors = [
  ["PWC-Logo.png", "PwC", "col-12 mb-2"],
  ["Oracle-Logo.svg", "Oracle", "col-12 my-2"],
  ["RBC-Logo.png", "RBC", "col-6 my-2"],
  ["Capital-Logo.png", "Capital One", "col-6 my-2"],
  ["Google-Cloud-Logo.png", "Google Cloud", "col-4 my-2"],
  ["Disney-Logo.png", "Disney", "col-4 my-2"],
  ["Microsoft-Logo.png", "Microsoft", "col-4 my-2"],
  ["EA-Logo.png", "EA", "col-4 my-2"],
  ["NSIN-Logo.png", "NSIN", "col-4 my-2"],
  ["FB-Logo.png", "Facebook", "col-4 my-2"],
] as const;

function HomeScene() {
  return (
    <div className="kh-home">
      <Image
        alt="sun"
        src="/assets/Home-Sun.png"
        width={1921}
        height={2201}
        className="sun"
        priority
      />
      <Image
        alt="clouds"
        src="/assets/Home-Clouds.png"
        width={2375}
        height={828}
        className="clouds"
        priority
      />
      <Image
        alt="water"
        src="/assets/Home-Water.png"
        width={1921}
        height={1081}
        className="water"
        priority
      />
      <div className="boat">
        <AnimatedBoat />
      </div>
    </div>
  );
}

function AboutScene() {
  return (
    <div className="kh-about">
      <div className="boat">
        <AnimatedBoat />
      </div>
      <div className="description">
        <h2>About Knight Hacks</h2>
        <p>
          Connect, Collaborate, and Create With 700 of the brightest developers,
          engineers, and designers in the south-east. Whether you’re a seasoned
          hacker or a tech newbie, Knight Hacks welcomes you. Just bring an open
          mind and an insatiable desire to learn, and we’ll take care of the
          rest. Create a product, learn new skills, and have fun with friends
          old and new - all in 36 hours.
        </p>
      </div>
    </div>
  );
}

function SponsorScene() {
  const [visibleBoats, setVisibleBoats] = useState(3);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    const timers = [
      window.setTimeout(() => setVisibleBoats(6), 10_000),
      window.setTimeout(() => setVisibleBoats(9), 20_000),
      window.setTimeout(() => setVisibleBoats(10), 30_000),
    ];

    return () => timers.forEach(window.clearTimeout);
  }, []);

  return (
    <div className="kh-sponsor">
      <div className="boat">
        <AnimatedBoat />
      </div>
      {sponsorBoats
        .slice(0, visibleBoats)
        .map(([file, name, className], index) => (
          <div className={`sponsor-boat ${className}`} key={`${file}-${index}`}>
            <Image
              src={`/assets/boats/${file}`}
              alt={`${name} sponsor boat`}
              width={500}
              height={450}
              style={{ width: "auto" }}
            />
          </div>
        ))}
      <div className="reduced-sponsor-grid" aria-label="2020 sponsors">
        {mobileSponsors.map(([file, name]) => (
          <Image
            key={file}
            src={`/assets/sponsors/${file}`}
            alt={name}
            width={180}
            height={110}
            loading="eager"
          />
        ))}
      </div>
    </div>
  );
}

function ScheduleScene() {
  return (
    <div className="kh-schedule">
      <div className="boat">
        <AnimatedBoat />
      </div>
      <div className="glacier" />
      <div className="description">
        <h2>Schedule</h2>
        <div className="schedule-holder">
          {schedule.map(({ day, events }) => (
            <div className="day" key={day}>
              <p>{day}</p>
              {events.map((event) => (
                <p key={event}>{event}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FaqScene() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="kh-faq">
      <div className="glacier" />
      <div className="faq-wrapper">
        <h2>FAQS</h2>
        {faqs.map((faq, index) => (
          <div className="faq" key={faq.title}>
            <button
              type="button"
              aria-expanded={openIndex === index}
              onClick={() => setOpenIndex(index)}
            >
              {faq.title}
            </button>
            {openIndex === index ? (
              <p>
                {faq.description}{" "}
                {faq.href ? (
                  <a href={faq.href} target="_blank" rel="noreferrer">
                    Read the code of conduct.
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DesktopArchive() {
  const [page, setPage] = useState<Page>("home");
  const darkIcons = page === "schedule" || page === "faq";

  return (
    <div className="kh-holder">
      {page !== "faq" ? (
        <div className="row logo-holder">
          <div className="col-12">
            <Image
              alt="Knight Hacks 2020"
              src="/assets/Logo.svg"
              width={400}
              height={180}
              priority
            />
          </div>
          <div className="col-12">
            <div className="description">October 9th - October 11th, 2020</div>
          </div>
        </div>
      ) : null}

      {page === "home" ? <HomeScene /> : null}
      {page === "about" ? <AboutScene /> : null}
      {page === "sponsors" ? <SponsorScene /> : null}
      {page === "schedule" ? <ScheduleScene /> : null}
      {page === "faq" ? <FaqScene /> : null}

      <div className="navigation">
        <a
          id="mlh-trust-badge"
          href="https://mlh.io/seasons/na-2020/events"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/assets/mlh-trust-badge-2020-white.svg"
            alt="Major League Hacking 2020 Hackathon Season"
            width={100}
            height={175}
          />
        </a>
        <nav
          className="col-12 navigation-row"
          aria-label="Knight Hacks 2020 sections"
          style={{ color: darkIcons ? "black" : "white" }}
        >
          {pages.map(({ id, label }) => (
            <button
              type="button"
              key={id}
              aria-current={page === id ? "page" : undefined}
              onClick={() => setPage(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="col-12 social-row">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
            >
              <Image
                alt=""
                src={darkIcons ? link.black : link.white}
                width={30}
                height={30}
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileArchive() {
  return (
    <div className="kh-mobile row justify-content-center align-items-center no-gutters">
      <section className="home">
        <div className="row logo-holder no-gutters">
          <div className="col-12">
            <Image
              alt="Knight Hacks 2020"
              src="/assets/Logo.svg"
              width={400}
              height={180}
              priority
            />
          </div>
          <div className="col-12">
            <div className="date">October 9th - October 11th, 2020</div>
          </div>
          <div className="col-12">
            <AnimatedBoat mobile />
          </div>
        </div>
      </section>
      <section className="about">
        <h1 className="title">
          Connect.
          <br />
          Collaborate.
          <br />
          Create.
        </h1>
        <p className="description">
          With 700 of the brightest developers, engineers, and designers in the
          south-east. Whether you’re a seasoned hacker or a tech newbie, Knight
          Hacks welcomes you. Just bring an open mind and an insatiable desire
          to learn, and we’ll take care of the rest. Create a product, learn new
          skills, and have fun with friends old and new - all in 36 hours.
        </p>
      </section>
      <section className="schedule">
        <h2 className="title">Schedule</h2>
        <div className="schedule-holder">
          {schedule.map(({ day, events }) => (
            <div key={day}>
              <p>{day}</p>
              <div className="day">
                {events.map((event) => (
                  <p key={event}>{event}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="register">
        <h2>Sponsors</h2>
        <div className="row justify-content-center sponsor-holder">
          {mobileSponsors.map(([file, name, className]) => (
            <div className={className} key={file}>
              <div className="sponsor">
                <Image
                  src={`/assets/sponsors/${file}`}
                  alt={name}
                  width={420}
                  height={300}
                />
              </div>
            </div>
          ))}
        </div>
        <Image
          className="castle"
          src="/assets/Castle.png"
          alt="castle"
          width={737}
          height={858}
        />
      </section>
    </div>
  );
}

export function Archive2020() {
  return (
    <main className="global">
      <div className="row no-gutters">
        <div className="col-12 desktop-media">
          <DesktopArchive />
        </div>
        <div className="col-12 mobile-media">
          <MobileArchive />
        </div>
      </div>
    </main>
  );
}
