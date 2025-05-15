import SwordSVG from '../_components/landing/assets/sword';
import AbstractShapeLeft1SVG from './_components/assets/abstract-shape-left-1';
import AbstractShapeLeft2SVG from './_components/assets/abstract-shape-left-2';
import AbstractShapeRight1SVG from './_components/assets/abstract-shape-right-1';
import AbstractShapeRight2SVG from './_components/assets/abstract-shape-right-2';
import BinaryIconSVG from './_components/assets/binary-icon';
import BlankCalendarSVG from './_components/assets/blank-calendar';
import ChatBubbleSVG from './_components/assets/chat-bubble';
import LaptopChargingSVG from './_components/assets/laptop-charging';
import TerminalIconSVG from './_components/assets/terminal-icon';
import TKNeonSVG from './_components/assets/tk-neon';
import TKNeonSignSVG from './_components/assets/tk-neon-sign';
import Button from './_components/button';
import LinksHeader from './_components/links-header';

export default function links() {
  return (
    <div className="h-auto w-screen overflow-hidden bg-[#0F172A] min-h-screen">

      {/* Background SVGs */}
      <div className='relative z-0'>
        {/* Left-side SVGs */}
        <BinaryIconSVG className="absolute lg:top-[-130px] top-[-82px] lg:w-[780px] w-[420px] lg:h-[380px] h-[250px] left-0" viewBox="0 0 1167 500"/>
        <AbstractShapeLeft1SVG className="absolute lg:top-[80px] top-[-80px] lg:w-[310px] w-[180px] lg:left-[210px] left-0" />
        <TKNeonSVG className="absolute lg:top-[60px] top-[-80px] lg:w-[300px] w-[180px] left-0" />
        <TKNeonSignSVG className="absolute top-[150px] lg:w-[310px] w-[180px] lg:left-[250px] left-0" />
        <AbstractShapeLeft2SVG className="absolute lg:top-[640px] top-[540px] lg:w-[380px] w-[180px] lg:left-[340px] left-0" />

        {/* Right-side SVGs */}
        <AbstractShapeRight1SVG className="absolute lg:top-[-200px] top-[-280px] right-0 lg:w-[330px] w-[180px]" />
        <TerminalIconSVG className="absolute top-[-870px] lg:right-[450px] right-[15px] lg:w-[700px] w-[400px]" />
        <AbstractShapeRight2SVG className="absolute lg:top-[510px] top-[360px] lg:right-[160px] right-[10px] lg:w-[220px] w-[80px]" />
        <SwordSVG className="absolute lg:top-[170px] top-[-90px] lg:right-[430px] right-[-80px] w-[240px] lg:w-[480px]" transform="scale(-1,1)" />
      </div>

      {/* Header */}
      <LinksHeader />

      {/* Buttons */}
      <main className="relative z-10 px-8 py-14 mt-10 flex justify-center items-center flex-col">
        <div className="flex flex-col gap-y-12 md:gap-y-20 w-[max-content] items-stretch justify-center [&_*]:h-16 [&_*]:md:h-24 [&_*]:justify-center">
          <Button href="https://discord.knighthacks.org" target="_blank" rel="noopener noreferrer" icon={ChatBubbleSVG}>Join the Discord!</Button>
          <Button href="https://calendar.google.com/calendar/embed?src=c_0b9df2b0062a5d711fc16060ff3286ef404b174bfafc4cbdd4e3009e91536e94%40group.calendar.google.com&ctz=America%2FNew_York" target="_blank" rel="noopener noreferrer" icon={BlankCalendarSVG}>KnightHacks Calendar</Button>
          <Button href="https://instagram.com/knighthacks" target="_blank" rel="noopener noreferrer" icon={LaptopChargingSVG}>Discover more Hackathons!</Button>
        </div>
      </main>

    </div>
  );
}
