import SwordSVG from "~/app/_components/landing/assets/sword";
import AbstractShapeLeft1SVG from "~/app/_components/links/assets/abstract-shape-left-1";
import AbstractShapeLeft2SVG from "~/app/_components/links/assets/abstract-shape-left-2";
import AbstractShapeRight1SVG from "~/app/_components/links/assets/abstract-shape-right-1";
import AbstractShapeRight2SVG from "~/app/_components/links/assets/abstract-shape-right-2";
import BinaryIconSVG from "~/app/_components/links/assets/binary-icon";
import BlankCalendarSVG from "~/app/_components/links/assets/blank-calendar";
import ChatBubbleSVG from "~/app/_components/links/assets/chat-bubble";
import LaptopChargingSVG from "~/app/_components/links/assets/laptop-charging";
import TerminalIconSVG from "~/app/_components/links/assets/terminal-icon";
import TKNeonSVG from "~/app/_components/links/assets/tk-neon";
import TKNeonSignSVG from "~/app/_components/links/assets/tk-neon-sign";
import Button from "~/app/_components/links/button";
import LinksHeader from "~/app/_components/links/links-header";

const buttons = [
  {
    text: "Join the Discord!",
    icon: ChatBubbleSVG,
    href: "https://discord.knighthacks.org",
  },
  {
    text: "KnightHacks Calendar",
    icon: BlankCalendarSVG,
    href: "https://calendar.google.com/calendar/embed?src=c_0b9df2b0062a5d711fc16060ff3286ef404b174bfafc4cbdd4e3009e91536e94%40group.calendar.google.com&ctz=America%2FNew_York",
  },
  {
    text: "Discover more Hackathons!",
    icon: LaptopChargingSVG,
    href: "https://mlh.io/seasons/2025/events",
  },
];

export default function links() {
  return (
    <div className="h-auto min-h-screen w-screen overflow-hidden bg-[#0F172A]">
      {/* Background SVGs */}
      <div className="relative z-0">
        {/* Left-side SVGs */}
        <BinaryIconSVG
          className="absolute left-0 top-[-82px] h-[250px] w-[420px] lg:top-[-130px] lg:h-[380px] lg:w-[780px]"
          viewBox="0 0 1167 500"
        />
        <AbstractShapeLeft1SVG className="absolute left-0 top-[-80px] w-[180px] lg:left-[210px] lg:top-[80px] lg:w-[310px]" />
        <TKNeonSVG className="absolute left-0 top-[-80px] w-[180px] lg:top-[60px] lg:w-[300px]" />
        <TKNeonSignSVG className="absolute left-0 top-[150px] w-[180px] lg:left-[250px] lg:w-[310px]" />
        <AbstractShapeLeft2SVG className="absolute left-0 top-[540px] w-[180px] lg:left-[340px] lg:top-[640px] lg:w-[380px]" />

        {/* Right-side SVGs */}
        <AbstractShapeRight1SVG className="absolute right-0 top-[-280px] w-[180px] lg:top-[-200px] lg:w-[330px]" />
        <TerminalIconSVG className="absolute right-[15px] top-[-870px] w-[400px] lg:right-[450px] lg:w-[700px]" />
        <AbstractShapeRight2SVG className="absolute right-[10px] top-[360px] w-[80px] lg:right-[160px] lg:top-[510px] lg:w-[220px]" />
        <SwordSVG
          className="absolute right-[-80px] top-[-90px] w-[240px] lg:right-[430px] lg:top-[170px] lg:w-[480px]"
          transform="scale(-1,1)"
        />
      </div>

      {/* Header */}
      <LinksHeader />

      {/* Buttons */}
      <main className="relative z-10 mt-10 flex flex-col items-center justify-center px-8 py-14">
        <div className="flex w-[max-content] flex-col items-stretch justify-center gap-y-12 md:gap-y-20 [&_*]:h-16 [&_*]:justify-center [&_*]:md:h-24">
          {buttons.map(({ text, icon, href }) => (
            <Button
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              icon={icon}
            >
              {text}
            </Button>
          ))}
        </div>
      </main>
    </div>
  );
}
