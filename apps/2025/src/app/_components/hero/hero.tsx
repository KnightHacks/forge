import HeroSVG from "./hero-svg";
import KnightHacksSVG from "./knight-hacks-svg";
import RegisterButton from "./register-button";

export default function Hero() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <KnightHacksSVG className="h-auto w-[70%] sm:w-[65%] md:w-[55%] lg:w-[45%] xl:w-[40%] 2xl:w-[30%]" />
      <HeroSVG className="mb-4 h-auto w-[70%] sm:w-[65%] md:mb-8 md:w-[55%] lg:w-[45%] xl:w-[40%] 2xl:w-[30%]" />
      <RegisterButton />
    </div>
  );
}
