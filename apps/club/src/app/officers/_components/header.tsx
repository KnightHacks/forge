import NeonTkSVG from "~/app/_components/landing/assets/neon-tk";
import SwordSVG from "~/app/_components/landing/assets/sword";
import HeroSVG from "~/app/_components/landing/hero-assets/hero-icon";

export default function Header() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <h1 className="font-pragati mb-6 text-4xl font-bold leading-tight tracking-tight text-white [text-shadow:0px_0px_40px_#6B21A8,0px_0px_20px_#6B21A8,0px_0px_10px_#6B21A8] md:text-8xl">
          Meet Our Executive Officers
        </h1>

        <HeroSVG className="-mt-24 h-[360px] w-full max-w-[720px] transform text-purple-400 opacity-50" />
      </div>

      <NeonTkSVG className="absolute -left-5 bottom-14 hidden h-[200px] w-full max-w-[400px] transform text-purple-400 opacity-50 md:block" />
      <SwordSVG className="absolute -top-20 right-14 hidden h-auto w-full max-w-[400px] transform text-purple-400 opacity-50 md:block" />
    </div>
  );
}
