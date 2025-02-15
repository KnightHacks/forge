import NeonTkSVG from "~/app/_components/landing/assets/neon-tk";
import SwordSVG from "~/app/_components/landing/assets/sword";
import HeaderSVG from "./assets/officer-header-svg";

export default function Header() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Desktop SVG header, hidden on mobile */}
      <HeaderSVG className="hidden h-auto w-auto pt-20 md:block md:pt-0" />

      {/* Mobile-friendly header content */}
      <div className="flex h-full flex-col items-center justify-center px-4 text-center md:hidden">
        <h1 className="font-pragati mb-6 text-3xl font-bold leading-tight tracking-tight text-white [text-shadow:0px_0px_40px_#6B21A8,0px_0px_20px_#6B21A8,0px_0px_10px_#6B21A8]">
          Meet Our Officers
        </h1>
        {/* Mobile versions of the SVGs, positioned appropriately */}
        <NeonTkSVG className="h-[120px] w-full max-w-[240px] transform text-purple-400 opacity-50" />
      </div>

      {/* Desktop-only decorative elements, hidden on mobile */}
      <NeonTkSVG className="absolute -left-5 bottom-14 hidden h-[200px] w-full max-w-[400px] transform text-purple-400 opacity-50 md:block" />
      <SwordSVG className="absolute -top-20 right-14 hidden h-auto w-full max-w-[400px] transform text-purple-400 opacity-50 md:block" />
    </div>
  );
}
