import NeonTkSVG from "~/app/_components/landing/assets/neon-tk";
import SwordSVG from "~/app/_components/landing/assets/sword";
import HeaderSVG from "./assets/officer-header-svg";

export default function Header() {
  return (
    <div className="h-screen">
      <HeaderSVG className="h-auto w-auto" />
      <NeonTkSVG className="absolute -bottom-11 -left-20 hidden h-auto w-full max-w-[400px] transform text-purple-400 opacity-50 md:block" />
      <SwordSVG className="absolute -top-20 right-14 hidden h-auto w-full max-w-[400px] transform text-purple-400 opacity-50 md:block" />
    </div>
  );
}
