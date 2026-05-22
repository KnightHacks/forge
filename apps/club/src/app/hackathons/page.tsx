import Image from "next/image";
import Link from "next/link";

interface Hackathon {
  name: string;
  date: string;
  competitors: number;
  projects: number;
  siteUrl?: string;
}

const hackathons: Hackathon[] = [
  {
    name: "Knight Hacks VIII",
    date: "Oct 24-26, 2025",
    competitors: 641,
    projects: 188,
    siteUrl: "https://2025.knighthacks.org",
  },
  {
    name: "Knight Hacks VII",
    date: "Oct 4-6, 2024",
    competitors: 310,
    projects: 93,
  },
  {
    name: "Knight Hacks VI",
    date: "Oct 6-8, 2023",
    competitors: 323,
    projects: 99,
  },
  {
    name: "Knight Hacks IV",
    date: "Nov 12-14, 2021",
    competitors: 180,
    projects: 57,
  },
  {
    name: "Knight Hacks III",
    date: "Mar 1-3, 2019",
    competitors: 192,
    projects: 78,
  },
  {
    name: "Knight Hacks II",
    date: "Oct 7-8, 2017",
    competitors: 141,
    projects: 56,
  },
  {
    name: "Knight Hacks I",
    date: "Jan 15-16, 2016",
    competitors: 75,
    projects: 34,
  },
];

const navLinks = ["Home", "Teams", "Events", "Sponsors"];

const formatCount = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

function BrutalistNav() {
  return (
    <nav
      aria-label="Primary"
      className="mx-auto flex min-h-[81px] max-w-[1354px] items-center justify-between border-[3px] border-black bg-[#6f203a]/70 px-4 shadow-[6px_6px_0_rgba(0,0,0,0.22)] sm:px-7"
      style={{ width: "calc(100vw - 40px)" }}
    >
      <Link
        href="/"
        className="flex items-center gap-3"
        aria-label="Knight Hacks home"
      >
        <Image
          src="/hackathons/Logo 130.svg"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10"
          priority
        />
        <span className="hidden text-[16px] font-black uppercase leading-6 tracking-[1.2875px] text-white sm:block">
          Knight Hacks
        </span>
      </Link>

      <div className="hidden items-center justify-center gap-1 lg:flex">
        {navLinks.map((link) => (
          <Link
            key={link}
            href={link === "Home" ? "/" : `/${link.toLowerCase()}`}
            className="px-4 py-2 text-[13px] font-bold uppercase leading-[19.5px] tracking-[0.5738px] text-white"
          >
            {link}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="https://blade.knighthacks.org"
          className="hidden h-[43px] items-center justify-center border-[2.5px] border-black bg-[#1a0b21] px-[22px] text-center text-[12px] font-bold uppercase leading-[18px] tracking-[0.6px] text-white shadow-[4px_4px_0_#f4ca41] sm:flex"
        >
          Sign up with Blade
        </Link>
        <Link
          href="https://discord.gg/knighthacks"
          className="flex h-[43px] shrink-0 items-center justify-center whitespace-nowrap border-[2.5px] border-black bg-gradient-to-r from-[#ffe1bd] to-[#fe88a4] px-[22px] text-center text-[12px] font-bold uppercase leading-[18px] tracking-[0.6px] text-black shadow-[4px_4px_0_white]"
        >
          Join Discord
        </Link>
      </div>
    </nav>
  );
}

function StatBurst({
  value,
  label,
  variant,
  className = "",
}: {
  value: string;
  label: string;
  variant: "hackers" | "projects";
  className?: string;
}) {
  const isHackers = variant === "hackers";

  return (
    <div
      className={`absolute z-20 flex items-center justify-center ${className}`}
      aria-label={`${value} ${label.toLowerCase()}`}
    >
      <Image
        src={
          isHackers
            ? "/hackathons/star-hackers.svg"
            : "/hackathons/star-projects.svg"
        }
        alt=""
        fill
        sizes={isHackers ? "227px" : "250px"}
        className="object-fill"
      />
      <Image
        src={
          isHackers
            ? "/hackathons/hacker-layer.png"
            : "/hackathons/projects-layer.png"
        }
        alt=""
        fill
        sizes={isHackers ? "227px" : "250px"}
        className="object-fill"
      />
      <div
        className={`relative flex flex-col items-center text-center font-black uppercase ${
          isHackers
            ? "rotate-[6deg] text-black [text-shadow:1px_1px_0_white]"
            : "rotate-[-6deg] text-white [text-shadow:2px_2px_0_#ffb62b]"
        }`}
      >
        <span
          className={
            isHackers
              ? "text-[28px] leading-[34px] sm:text-[44px] sm:leading-[61px]"
              : "text-[28px] leading-[34px] sm:text-[48px] sm:leading-[61px]"
          }
        >
          {value}
        </span>
        <span className="mt-[-8px] text-[15px] leading-[22px] sm:mt-[-18px] sm:text-[24px] sm:leading-[36px]">
          {label}
        </span>
      </div>
    </div>
  );
}

function PhotoCard({
  hackathon,
  reverse,
  side,
}: {
  hackathon: Hackathon;
  reverse: boolean;
  side: "left" | "right";
}) {
  const isLeftSide = side === "left";

  return (
    <div
      className={`relative mx-auto h-[288px] w-[238px] ${
        reverse ? "-rotate-6" : "rotate-6"
      } sm:h-[435px] sm:w-[360px]`}
    >
      <div className="absolute inset-0 border border-black bg-[#f8f7f3] shadow-[6px_6px_0_#1b1425,12px_12px_22.5px_rgba(0,0,0,0.6)]" />
      <div className="absolute left-[10px] top-[10px] h-[238px] w-[218px] overflow-hidden border border-[#99a1af] bg-[#27272a] sm:left-[15px] sm:top-[15px] sm:h-[358.5px] sm:w-[328.5px]">
        <div className="absolute inset-0 bg-[#242625]" />
      </div>

      <p className="absolute bottom-[16px] left-1/2 w-[170px] -translate-x-1/2 -rotate-2 text-center font-mono text-[10px] font-bold uppercase leading-[15px] tracking-[-0.525px] text-black">
        Put some cool phrase here idk
      </p>

      <StatBurst
        value={formatCount(hackathon.competitors)}
        label="Hackers"
        variant="hackers"
        className={`-left-[38px] -top-[32px] h-[96px] w-[127px] ${
          isLeftSide
            ? "rotate-[18.16deg] sm:left-[-113.99px] sm:top-[-67px]"
            : "rotate-[-6.16deg] sm:left-[-100.47px] sm:top-[-47.83px]"
        } sm:h-[181.1789272027866px] sm:w-[226.568625901294px]`}
      />
      <StatBurst
        value={formatCount(hackathon.projects)}
        label="Projects"
        variant="projects"
        className={`-right-[34px] bottom-[-34px] h-[96px] w-[127px] ${
          isLeftSide
            ? "rotate-[-6.16deg] sm:left-[267px] sm:top-[304px]"
            : "rotate-[18.16deg] sm:left-[253.48px] sm:top-[284.84px]"
        } sm:h-[181.17890249366883px] sm:w-[226.56859500194523px]`}
      />
    </div>
  );
}

function HackathonDetails({ hackathon }: { hackathon: Hackathon }) {
  const content = (
    <div className="relative h-[204px] w-[min(440px,100%)]">
      <div className="absolute left-0 top-0 flex flex-col items-start gap-2">
        <div className="-rotate-2 bg-[#de2868] px-3 py-1">
          <p className="text-[18px] font-black uppercase leading-[32px] tracking-[-0.18px] text-white sm:text-[24px] sm:leading-[43.2px]">
            {hackathon.date}
          </p>
        </div>
        <div className="rotate-1 border-b-4 border-[#f4ca41]">
          <h2 className="text-[31px] font-black uppercase leading-[38px] tracking-[-1.5px] text-white sm:whitespace-nowrap sm:text-[48px] sm:leading-[43.2px] sm:tracking-[-2.0484px]">
            {hackathon.name}
          </h2>
        </div>
      </div>

      <Link
        href={hackathon.siteUrl ?? "#"}
        className="absolute top-[137px] flex h-12 w-[308px] items-center justify-center border-2 border-white bg-transparent text-center text-[14px] font-bold uppercase leading-[21px] tracking-[0.3992px] text-white shadow-[4px_4px_0_rgba(255,255,255,0.3)]"
      >
        View Hackathon Site{" "}
        <span aria-hidden="true" className="pl-2 text-[18px]">
          →
        </span>
      </Link>
    </div>
  );

  return content;
}

function TimelineItem({
  hackathon,
  index,
}: {
  hackathon: Hackathon;
  index: number;
}) {
  const imageFirst = index % 2 === 0;

  return (
    <li className="relative grid min-h-[620px] items-center gap-12 py-12 lg:grid-cols-[1fr_330px_1fr] lg:gap-0 lg:py-20">
      <div className="absolute left-1/2 top-1/2 z-10 hidden h-[25px] w-[25px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-white bg-[#ffb62b] lg:block" />

      <div className="flex justify-center lg:justify-start">
        {imageFirst ? (
          <PhotoCard
            hackathon={hackathon}
            reverse={index % 4 === 0}
            side="left"
          />
        ) : (
          <HackathonDetails hackathon={hackathon} />
        )}
      </div>

      <div className="hidden lg:block" />

      <div
        className={`flex justify-center ${
          imageFirst ? "lg:justify-start" : "lg:justify-end"
        }`}
      >
        {imageFirst ? (
          <HackathonDetails hackathon={hackathon} />
        ) : (
          <PhotoCard
            hackathon={hackathon}
            reverse={index % 4 === 1}
            side="right"
          />
        )}
      </div>
    </li>
  );
}

function Footer() {
  return (
    <footer className="bg-[#140316] px-8 pb-10 pt-20 text-white">
      <div className="mx-auto flex max-w-[1222px] flex-col gap-14 lg:flex-row lg:justify-between">
        <div className="max-w-[348px]">
          <Image src="/kh-logo.svg" alt="" width={43} height={43} />
          <p className="mt-5 text-[16px] leading-[24.375px] tracking-[-0.2344px] text-[#99a1af]">
            Empowering students to grow as developers and leaders in tech
            through hands-on creation.
          </p>
          <div
            className="mt-7 flex gap-4 text-[#d1d5dc]"
            aria-label="Social links"
          >
            <a
              href="https://twitter.com/knighthacks"
              aria-label="Knight Hacks Twitter"
            >
              𝕏
            </a>
            <a
              href="mailto:team@knighthacks.org"
              aria-label="Email Knight Hacks"
            >
              @
            </a>
            <a
              href="https://instagram.com/knighthacks"
              aria-label="Knight Hacks Instagram"
            >
              ◎
            </a>
            <a
              href="https://linkedin.com/company/knight-hacks"
              aria-label="Knight Hacks LinkedIn"
            >
              in
            </a>
          </div>
        </div>

        <div className="flex gap-24">
          <div>
            <h2 className="text-[18px] font-semibold leading-7 tracking-[-0.4395px]">
              Quick Links
            </h2>
            <div className="mt-7 flex flex-col gap-5 text-[16px] leading-[22.5px] tracking-[-0.2344px] text-[#d1d5dc]">
              <Link href="/">Home</Link>
              <Link href="/teams">Teams</Link>
              <Link href="/events">Events</Link>
              <Link href="/sponsors">Sponsors</Link>
            </div>
          </div>
          <div>
            <h2 className="text-[18px] font-semibold leading-7 tracking-[-0.4395px]">
              Resources
            </h2>
            <div className="mt-7 flex flex-col gap-5 text-[16px] leading-[22.5px] tracking-[-0.2344px] text-[#d1d5dc]">
              <Link href="https://blade.knighthacks.org">Blade</Link>
              <Link href="https://discord.gg/knighthacks">Discord</Link>
              <span>idk</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-[1222px] border-t border-white/10 pt-8">
        <p className="text-[14px] leading-5 tracking-[-0.1504px] text-[#99a1af]">
          © Copyright 2026, All Rights Reserved by Knight Hacks
        </p>
      </div>
    </footer>
  );
}

export default function HackathonsPage() {
  return (
    <main
      className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[#140422] font-sans text-white"
      style={{ width: "100vw" }}
    >
      <style>{`
        html,
        body {
          max-width: 100vw;
          overflow-x: hidden;
        }
      `}</style>
      <section className="relative w-full max-w-[100vw] overflow-hidden bg-[radial-gradient(circle_at_105%_20%,rgba(177,84,76,0.32),transparent_28%),radial-gradient(circle_at_0%_88%,rgba(111,53,31,0.82),transparent_31%),linear-gradient(120deg,#2a0642_0%,#310631_36%,#140422_63%,#0b020c_100%)]">
        <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#f4ca41_0.8px,transparent_0.8px)] [background-size:7px_7px]" />
        <div className="relative z-10 pt-[45px]">
          <BrutalistNav />

          <p className="mx-auto mt-[236px] w-full max-w-[1237px] break-words px-6 text-center text-[28px] font-black leading-[34px] tracking-[-1px] text-white sm:text-[48px] sm:leading-[43.2px] sm:tracking-[-2.0484px]">
            KnightHacks Hackathon Timeline
          </p>

          <ol className="relative mx-auto mt-[260px] w-full max-w-[1172px] px-5 pb-36 sm:px-10">
            <li
              aria-hidden="true"
              className="absolute bottom-0 left-1/2 top-[40px] hidden w-[6px] -translate-x-1/2 list-none bg-[linear-gradient(180deg,#290c2d_0%,#ffb135_8%,#ffffff_48%,#fcfcfc_52%,#ffb135_92%,#26081c_100%)] lg:block"
            />
            {hackathons.map((hackathon, index) => (
              <TimelineItem
                key={hackathon.name}
                hackathon={hackathon}
                index={index}
              />
            ))}
          </ol>
        </div>
      </section>

      <Footer />
    </main>
  );
}
