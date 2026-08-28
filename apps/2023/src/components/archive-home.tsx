import Image from "next/image";

import { Faq } from "~/components/faq";

const sponsors = [
  {
    name: "Morgan & Morgan",
    logo: "/assets/morganmorgan.png",
    url: "https://www.forthepeople.com/",
    className: "sponsor-morgan",
    width: 1110,
    height: 177,
  },
  {
    name: "Siemens Energy",
    logo: "/assets/siemens.png",
    url: "https://www.siemens-energy.com/global/en.html",
    className: "sponsor-siemens",
    width: 834,
    height: 285,
  },
  {
    name: "GEICO",
    logo: "/assets/geico.png",
    url: "https://www.geico.com/",
    className: "sponsor-geico",
    width: 1044,
    height: 234,
  },
  {
    name: "Microsoft",
    logo: "/assets/microsoft.png",
    url: "https://www.microsoft.com/en-us/",
    className: "sponsor-microsoft",
    width: 1101,
    height: 234,
  },
  {
    name: "RBC Royal Bank",
    logo: "/assets/rbc.png",
    url: "https://www.rbc.com/",
    className: "sponsor-rbc",
    width: 932,
    height: 355,
  },
  {
    name: "Lockheed Martin",
    logo: "/assets/lockheed.png",
    url: "https://www.lockheedmartin.com/",
    className: "sponsor-lockheed",
    width: 1413,
    height: 354,
  },
  {
    name: "ToolCharm",
    logo: "/assets/toolcharm.png",
    url: null,
    className: "sponsor-toolcharm",
    width: 734,
    height: 128,
  },
] as const;

export function ArchiveHome() {
  return (
    <main className="archive-home">
      <a
        className="mlh-badge"
        href="https://mlh.io/seasons/2024/events"
        target="_blank"
        rel="noreferrer"
        aria-label="Major League Hacking 2024 season events"
      >
        <Image
          src="/assets/banner.png"
          alt="Official MLH 2024 season event"
          width={450}
          height={690}
          priority
        />
      </a>

      <header className="archive-nav">
        <a href="#top" aria-label="Knight Hacks 2023 home">
          <Image
            src="/assets/logo.png"
            alt="Knight Hacks"
            width={398}
            height={106}
            priority
          />
        </a>
        <a className="past-event" href="https://2026.knighthacks.org/">
          Past event
        </a>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="event-date">October 6-8, 2023</div>
        <div className="hero-title-row">
          <Image src="/assets/dice1.png" alt="" width={210} height={211} />
          <h1 id="hero-title">Choose Your Own Adventure</h1>
          <Image src="/assets/dice2.png" alt="" width={211} height={211} />
        </div>
        <p>
          A ✨fantasy-themed✨ hackathon at the University of Central Florida
        </p>
        <div className="pillars" aria-label="Knight Hacks activities">
          <div>
            <span aria-hidden="true">🏆</span>
            <strong>Compete</strong>
          </div>
          <div>
            <span aria-hidden="true">🧠</span>
            <strong>Learn</strong>
          </div>
          <div>
            <span aria-hidden="true">💼</span>
            <strong>Network &amp; Have Fun!</strong>
          </div>
        </div>
      </section>

      <section className="content-section about" aria-labelledby="about-title">
        <h2 id="about-title">About Knight Hacks</h2>
        <p>
          Ready to kickstart your career in tech? Join us for Knighthacks!
          Students from around the world will come together to learn the latest
          technologies, develop innovative solutions, network with top
          companies, and more! This year, we are excited to announce two
          features to this year&apos;s hackathon; we are an MLH season starter
          hackathon and we have partnered with Hack@UCF to bring you the Horse
          Plinko Cyber Challenge, a blue team vs. red team competition as well
          as cybersecurity convention! Along with all our amazing workshops, you
          also have the chance work together to build exciting projects, meet
          recruiters and land job opportunities, win prizes, get swag, and have
          fun!
        </p>
      </section>

      <section className="content-section faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Frequently Asked Questions</h2>
        <Faq />
      </section>

      <section className="sponsors" aria-labelledby="sponsors-title">
        <h2 id="sponsors-title">Sponsors</h2>
        <div className="sponsor-grid">
          {sponsors.map((sponsor) => {
            const logo = (
              <Image
                className={sponsor.className}
                src={sponsor.logo}
                alt={`${sponsor.name} logo`}
                width={sponsor.width}
                height={sponsor.height}
              />
            );

            return sponsor.url ? (
              <a
                href={sponsor.url}
                target="_blank"
                rel="noreferrer"
                aria-label={sponsor.name}
                key={sponsor.name}
              >
                {logo}
              </a>
            ) : (
              <span
                className="sponsor-linkless"
                aria-label={sponsor.name}
                key={sponsor.name}
              >
                {logo}
              </span>
            );
          })}
        </div>
        <p>more sponsors being announced soon...</p>
      </section>

      <section className="archive-cta" aria-labelledby="archive-cta-title">
        <Image
          className="decor crystal"
          src="/assets/crystal.png"
          alt=""
          width={617}
          height={710}
        />
        <Image
          className="decor dagger"
          src="/assets/dagger.png"
          alt=""
          width={525}
          height={653}
        />
        <Image
          className="decor die"
          src="/assets/dice.png"
          alt=""
          width={531}
          height={568}
        />
        <Image
          className="decor spellbook"
          src="/assets/spellbook.png"
          alt=""
          width={662}
          height={620}
        />
        <h2 id="archive-cta-title">Knight Hacks 2023 has ended.</h2>
        <a href="https://2026.knighthacks.org/">Visit the current event</a>
      </section>

      <footer>
        Made with <span aria-label="love">❤️</span> by Knight Hacks
      </footer>
    </main>
  );
}
