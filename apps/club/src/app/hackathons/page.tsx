import Image from "next/image";
import Link from "next/link";

const navLinks = ["Home", "Teams", "Events", "Sponsors"];

const socialLinks = [
  {
    href: "https://twitter.com/knighthacks",
    label: "Knight Hacks X",
    icon: "/hackathons/icon-twitter.png",
  },
  {
    href: "mailto:team@knighthacks.org",
    label: "Email Knight Hacks",
    icon: "/hackathons/icon-email.png",
  },
  {
    href: "https://instagram.com/knighthacks",
    label: "Knight Hacks Instagram",
    icon: "/hackathons/icon-instagram.png",
  },
  {
    href: "https://linkedin.com/company/knight-hacks",
    label: "Knight Hacks LinkedIn",
    icon: "/hackathons/icon-linkedin.png",
  },
] as const;

const hackathons = [
  {
    name: "Knight Hacks VIII",
    date: "Oct 24 - 26, 2025",
    participants: 641,
    projects: 188,
    siteUrl: "https://knighthacksviii.devpost.com/",
  },
  {
    name: "Knight Hacks VII",
    date: "Oct 4 - 6, 2024",
    participants: 310,
    projects: 93,
    siteUrl: "https://knight-hacks-vii.devpost.com/",
  },
  {
    name: "Knight Hacks VI",
    date: "Oct 6 - 8, 2023",
    participants: 323,
    projects: 99,
    siteUrl: "https://knight-hacks-vi.devpost.com/",
  },
  {
    name: "Knight Hacks IV",
    date: "Nov 12 - 14, 2021",
    participants: 180,
    projects: 57,
    siteUrl: "https://knight-hacks-2021.devpost.com/",
  },
  {
    name: "Knight Hacks III",
    date: "Mar 1 - 3, 2019",
    participants: 192,
    projects: 78,
    siteUrl: "https://knight-hacks-2019.devpost.com/",
  },
  {
    name: "Knight Hacks II",
    date: "Oct 7 - 8, 2017",
    participants: 141,
    projects: 56,
    siteUrl: "https://knight-hacks-2017.devpost.com/",
  },
  {
    name: "Knight Hacks I",
    date: "Jan 15 - 16, 2016",
    participants: 75,
    projects: 34,
    siteUrl: "https://knight-hacks.devpost.com/",
  },
] as const;

const timelineRows = [
  {
    side: "left",
    cardX: 92.71826171875,
    cardY: 692.225341796875,
    cardWidth: 636.91552734375,
    cardHeight: 575.094482421875,
    detailsX: 921.5,
    detailsY: 865.12,
  },
  {
    side: "right",
    cardX: 808.5576171875,
    cardY: 1367.227294921875,
    cardWidth: 644.7265625,
    cardHeight: 585.4908447265625,
    detailsX: 152,
    detailsY: 1540.12,
  },
  {
    side: "left",
    cardX: 92.71826171875,
    cardY: 2042.2255859375,
    cardWidth: 636.91552734375,
    cardHeight: 575.093994140625,
    detailsX: 921.5,
    detailsY: 2215.12,
  },
  {
    side: "right",
    cardX: 808.5576171875,
    cardY: 2706.227294921875,
    cardWidth: 644.7265625,
    cardHeight: 585.490478515625,
    detailsX: 153,
    detailsY: 2879.12,
  },
  {
    side: "left",
    cardX: 92.71875,
    cardY: 3335.2255859375,
    cardWidth: 636.9150390625,
    cardHeight: 575.093994140625,
    detailsX: 922.5,
    detailsY: 3508.12,
  },
  {
    side: "right",
    cardX: 808.5576171875,
    cardY: 4009.227294921875,
    cardWidth: 644.7265625,
    cardHeight: 585.4908447265625,
    detailsX: 153,
    detailsY: 4182.12,
  },
  {
    side: "left",
    cardX: 92.71875,
    cardY: 4684.2255859375,
    cardWidth: 636.9150390625,
    cardHeight: 575.093994140625,
    detailsX: 922.5,
    detailsY: 4857.12,
  },
] as const;

function BrutalistNav() {
  return (
    <nav
      aria-label="Primary"
      className="absolute left-[74px] top-[45px] flex h-[81px] w-[1354px] items-center border-[3px] border-black bg-[#6f203a]/70 shadow-[6px_6px_0_rgba(0,0,0,0.22)]"
    >
      <Link
        href="/"
        className="absolute left-[26.777px] top-[20.5px] flex items-center gap-[11.969px]"
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
        <span className="text-[16px] font-black uppercase leading-6 tracking-[1.2875px] text-white">
          Knight Hacks
        </span>
      </Link>

      <div className="absolute left-[400px] top-[22px] flex h-9 w-[526px] items-center gap-4">
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

      <Link
        href="https://blade.knighthacks.org"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute left-[986px] top-[19px] flex h-[43px] w-[186px] items-center justify-center border-[2.5px] border-black bg-[#1a0b21] text-center text-[12px] font-bold uppercase leading-[18px] tracking-[0.6px] text-white shadow-[4px_4px_0_#f4ca41]"
      >
        Sign up with Blade
      </Link>
      <Link
        href="https://discord.gg/knighthacks"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute left-[1184px] top-[19px] flex h-[43px] w-[142px] items-center justify-center border-[2.5px] border-black bg-gradient-to-r from-[#ffe1bd] to-[#fe88a4] text-center text-[12px] font-bold uppercase leading-[18px] tracking-[0.6px] text-black shadow-[4px_4px_0_white]"
      >
        Join Discord
      </Link>
    </nav>
  );
}

function HackathonDetails({
  x,
  y,
  hackathon,
}: {
  x: number;
  y: number;
  hackathon: (typeof hackathons)[number];
}) {
  return (
    <div className="absolute h-[204px] w-[440px]" style={{ left: x, top: y }}>
      <div className="absolute left-0 top-0 flex flex-col items-start gap-2">
        <div className="-rotate-2 bg-[#de2868] px-3 py-1">
          <p className="text-[24px] font-black uppercase leading-[43.2px] tracking-[-0.18px] text-white">
            {hackathon.date}
          </p>
        </div>
        <div className="rotate-1 border-b-4 border-[#f4ca41]">
          <h2 className="whitespace-nowrap text-[48px] font-black uppercase leading-[43.2px] tracking-[-2.0484px] text-white">
            {hackathon.name}
          </h2>
        </div>
      </div>

      <Link
        href={hackathon.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-[137px] flex h-12 w-[308px] items-center justify-center border-2 border-white bg-transparent text-center text-[14px] font-bold uppercase leading-[21px] tracking-[0.3992px] text-white shadow-[4px_4px_0_rgba(255,255,255,0.3)]"
      >
        View Hackathon Site{" "}
        <span aria-hidden="true" className="pl-2 text-[18px]">
          →
        </span>
      </Link>
    </div>
  );
}

function Timeline() {
  return (
    <Image
      src="/hackathons/figma-timeline-extended.png"
      alt=""
      width={37}
      height={4910}
      className="absolute left-[738px] top-[705px] h-[4910px] w-[37px]"
    />
  );
}

function Footer() {
  return (
    <footer className="absolute left-[1px] top-[5800px] h-[444px] w-[1498px] bg-[#140316] text-white">
      <div className="absolute left-[138px] top-[81px] h-[206px] w-[348px]">
        <Image
          src="/hackathons/figma-footer-logo.png"
          alt=""
          width={43}
          height={43}
          className="h-[43px] w-[43px]"
        />
        <p className="mt-[21px] w-[336px] text-[16px] leading-[24.375px] tracking-[-0.2344px] text-[#99a1af]">
          Empowering students to grow as developers and leaders in tech through
          hands-on creation.
        </p>
        <div
          className="absolute left-0 top-[169.125px]"
          aria-label="Social links"
        >
          {socialLinks.map((social, index) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="absolute h-10 w-10"
              style={{ left: index * 48 - 8, top: -8 }}
            >
              <Image
                src={social.icon}
                alt=""
                width={24}
                height={24}
                className="absolute left-2 top-2 h-6 w-6"
              />
            </a>
          ))}
        </div>
      </div>

      <div className="absolute left-[1064px] top-[81px]">
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

      <div className="absolute left-[1256px] top-[81px]">
        <h2 className="text-[18px] font-semibold leading-7 tracking-[-0.4395px]">
          Resources
        </h2>
        <div className="mt-7 flex flex-col gap-5 text-[16px] leading-[22.5px] tracking-[-0.2344px] text-[#d1d5dc]">
          <Link
            href="https://blade.knighthacks.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Blade
          </Link>
          <Link
            href="https://discord.gg/knighthacks"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </Link>
          <span>idk</span>
        </div>
      </div>

      <div className="absolute left-[138px] top-[351px] h-px w-[1222px] bg-white/10" />
      <p className="absolute left-[138px] top-[384px] text-[14px] leading-5 tracking-[-0.1504px] text-[#99a1af]">
        © Copyright 2026, All Rights Reserved by Knight Hacks
      </p>
    </footer>
  );
}

export default function HackathonsPage() {
  return (
    <main className="min-h-screen overflow-x-auto bg-[#140422] font-sans text-white">
      <section className="relative mx-auto h-[6244px] w-[1498px] overflow-hidden">
        <Image
          src="/hackathons/figma-background.png"
          alt=""
          fill
          priority
          sizes="1498px"
          className="object-cover"
        />
        <div className="relative h-full w-full">
          <BrutalistNav />
          <h1 className="absolute left-[153px] top-[387px] w-[1237px] text-center text-[48px] font-black uppercase leading-[43.2px] tracking-[-2.0484px] text-white">
            Knight Hacks History
          </h1>

          <Timeline />

          {timelineRows.map((row, index) => {
            const hackathon = hackathons[index];

            if (!hackathon) {
              return null;
            }

            return (
              <div key={`${row.side}-${row.cardY}`}>
                <Image
                  src={`/hackathons/figma-card-real-${index}.png`}
                  alt=""
                  width={row.cardWidth}
                  height={row.cardHeight}
                  className="absolute"
                  sizes={`${Math.ceil(row.cardWidth)}px`}
                  style={{
                    left: row.cardX,
                    top: row.cardY,
                    width: row.cardWidth,
                    height: row.cardHeight,
                  }}
                />
                <HackathonDetails
                  x={row.detailsX}
                  y={row.detailsY}
                  hackathon={hackathon}
                />
              </div>
            );
          })}

          <Footer />
        </div>
      </section>
    </main>
  );
}
