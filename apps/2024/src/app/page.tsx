import type { CSSProperties } from "react";
import Image from "next/image";

const sponsors = [
  {
    name: "ServiceNow",
    tier: "gold",
    logo: "/sponsors/servicenow.svg",
    website: "https://www.servicenow.com/",
  },
  {
    name: "IBM",
    tier: "gold",
    logo: "/sponsors/ibm.svg",
    website: "https://www.ibm.com/",
  },
  {
    name: "NextEra Energy",
    tier: "gold",
    logo: "/sponsors/nextera-energy.svg",
    website: "https://www.nexteraenergy.com/",
  },
  {
    name: "BNY",
    tier: "gold",
    logo: "/sponsors/bny.svg",
    website: "https://www.bny.com/",
  },
  {
    name: "Siemens Energy",
    tier: "gold",
    logo: "/sponsors/siemens-energy.png",
    website: "https://www.siemens-energy.com/",
  },
  {
    name: "Impress Ink",
    tier: "silver",
    logo: "/sponsors/impress-ink.png",
    website: "https://www.impressink.com/",
  },
  {
    name: "Kinde",
    tier: "bronze",
    logo: "/sponsors/kinde.svg",
    website: "https://kinde.com/",
  },
  {
    name: "Synopsys",
    tier: "bronze",
    logo: "/sponsors/synopsys.svg",
    website: "https://www.synopsys.com/",
  },
  {
    name: "GEICO",
    tier: "bronze",
    logo: "/sponsors/geico.svg",
    website: "https://www.geico.com/",
  },
] as const;

const faqs = [
  [
    "What is a Hackathon?",
    "A hackathon is a weekend-long event where students come together to learn the latest technologies and build innovative projects. These projects can range from web or mobile development to hardware, or anything in between. Throughout the weekend, Knight Hacks hosts workshops, social events, networking opportunities with sponsors, free food, swag, and more.",
  ],
  [
    "How long is Knight Hacks?",
    "Knight Hacks ran throughout the weekend. Check-in was from 5 to 8 PM on Friday, the opening ceremony began at 8 PM, and the event ended at 6 PM on Sunday.",
  ],
  [
    "Who can attend Knight Hacks?",
    "Anyone who was a college student age 18 or older, or who had graduated within the previous year, was welcome to attend.",
  ],
  [
    "Do I need to have a team?",
    "Not at all. Hackers could work alone, arrive with a team of no more than four people, or join a team at the event.",
  ],
  [
    "How much experience do I need?",
    "None. Knight Hacks welcomes students from every academic background and skill level, with introductory workshops, industry mentors, and tools for first-time and experienced hackers alike.",
  ],
  [
    "Was travel assistance available?",
    "Travel reimbursements and buses were not offered for the 2024 event.",
  ],
] as const;

function Navigation() {
  return (
    <header className="site-header">
      <a className="brand" href="#hero" aria-label="Knight Hacks 2024 home">
        <Image src="/kh-logo.svg" alt="Knight Hacks" width={200} height={60} />
      </a>
      <nav className="desktop-nav" aria-label="Archive sections">
        <a href="#about">About</a>
        <a href="#faq">FAQ</a>
        <a href="#sponsors">Sponsors</a>
        <a href="#contact">Contact</a>
      </nav>
      <details className="mobile-nav">
        <summary aria-label="Open navigation">Menu</summary>
        <nav aria-label="Mobile archive sections">
          <a href="#about">About</a>
          <a href="#faq">FAQ</a>
          <a href="#sponsors">Sponsors</a>
          <a href="#contact">Contact</a>
        </nav>
      </details>
      <Image
        className="mlh-badge"
        src="/mlh-badge.svg"
        alt="Major League Hacking"
        width={100}
        height={200}
        priority
      />
    </header>
  );
}

function Hero() {
  return (
    <section id="hero" className="hero">
      <Image
        className="hero-title"
        src="/header.svg"
        alt="Knight Hacks VII — October 4–6, 2024"
        width={900}
        height={420}
        priority
      />
      <Image
        className="island"
        src="/island.svg"
        alt="Knight Hacks island"
        width={700}
        height={700}
        priority
      />
      <Image
        className="cloud cloud-one"
        src="/cloud.svg"
        alt=""
        width={450}
        height={300}
      />
      <Image
        className="cloud cloud-two"
        src="/cloud.svg"
        alt=""
        width={450}
        height={300}
      />
      <Image
        className="cloud cloud-three"
        src="/cloud.svg"
        alt=""
        width={450}
        height={300}
      />
      <Image
        className="ship"
        src="/ship.svg"
        alt="Ship"
        width={500}
        height={500}
      />
    </section>
  );
}

function SponsorSection() {
  return (
    <section id="sponsors" className="sponsors-section">
      <h1>Sponsors</h1>
      <div className="sponsor-grid">
        {sponsors.map((sponsor, index) => (
          <a
            className={`sponsor-bubble ${sponsor.tier}`}
            href={sponsor.website}
            key={sponsor.name}
            aria-label={`${sponsor.name} website`}
            style={{ "--delay": `${(index % 4) * -0.55}s` } as CSSProperties}
          >
            <Image
              src={sponsor.logo}
              alt={sponsor.name}
              width={240}
              height={120}
              loading="eager"
            />
          </a>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="faq-section">
      <h1>Frequently Asked Questions</h1>
      <div className="faq-list">
        {faqs.map(([question, answer], index) => (
          <details key={question} open={index === 0}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="contact-section">
      <div className="contact-copy">
        <h1>Get in Touch!</h1>
        <p>Care to learn more about Knight Hacks?</p>
        <p>
          Email the organizers at{" "}
          <a href="mailto:hackteam@knighthacks.org">hackteam@knighthacks.org</a>
          .
        </p>
      </div>
      <Image
        className="sand"
        src="/sand.svg"
        alt=""
        width={1920}
        height={360}
      />
      <Image
        className="seafloor algae-left"
        src="/algae1.svg"
        alt=""
        width={300}
        height={300}
      />
      <Image
        className="seafloor treasure"
        src="/treasure.svg"
        alt="Treasure chest"
        width={260}
        height={260}
      />
      <Image
        className="seafloor scuba"
        src="/scuba.svg"
        alt="Scuba diving Lenny"
        width={260}
        height={360}
      />
      <Image
        className="seafloor skull"
        src="/skull.svg"
        alt="Skull"
        width={180}
        height={180}
      />
      <Image
        className="seafloor algae-right"
        src="/algae3.svg"
        alt=""
        width={300}
        height={300}
      />
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <a href="https://github.com/KnightHacks" aria-label="Knight Hacks GitHub">
        <Image src="/kh-logo.svg" alt="Knight Hacks" width={200} height={60} />
      </a>
      <div className="footer-links">
        <a href="https://discord.com/invite/Kv5g9vf">Join our Discord</a>
        <a href="#faq">FAQ</a>
        <a href="https://static.mlh.io/docs/mlh-code-of-conduct.pdf">
          Code of Conduct
        </a>
      </div>
      <div className="social-links">
        <a href="https://discord.com/invite/Kv5g9vf" aria-label="Discord">
          <Image src="/discord.svg" alt="" width={44} height={44} />
        </a>
        <a href="https://www.instagram.com/knighthacks" aria-label="Instagram">
          <Image src="/instagram.svg" alt="" width={44} height={44} />
        </a>
        <a href="https://linktr.ee/knighthacks" aria-label="Knight Hacks links">
          <Image src="/LinkTree.svg" alt="" width={44} height={44} />
        </a>
      </div>
    </footer>
  );
}

export default function Archive2024() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <section id="about" className="about-section">
          <Image
            src="/about.svg"
            alt="Map with Knight Hacks logo and Lenny the dragon"
            width={900}
            height={900}
          />
        </section>
        <div className="deep-ocean">
          <SponsorSection />
          <FAQ />
          <Contact />
        </div>
      </main>
      <Footer />
    </>
  );
}
