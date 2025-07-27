import HeroSVG from "./hero-svg";
import KnightHacksSVG from "./knight-hacks-svg";
import RegisterButton from "./register-button";
import { env } from "~/env";

export default function Hero() {
  const registerUrl = env.BLADE_URL + "hacker/application/knighthacks-viii";
  return (
    <div className="flex h-screen flex-col items-center justify-center relative">
      <div className="relative w-full flex items-center justify-center" style={{ zIndex: 1, opacity: 0, animation: 'slideInFromTop 0.8s ease-out forwards' }}>
        <KnightHacksSVG
          role="img"
          aria-label="Knight Hacks 2025 - Official Hackathon Logo"
          className="h-auto w-[70%] sm:w-[65%] md:w-[55%] lg:w-[45%] xl:w-[40%] 2xl:w-[30%]"
        />
      </div>
      <div className="w-full flex items-center justify-center" style={{ opacity: 0, animation: 'popOut 0.6s 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards' }}>
        <HeroSVG
          role="img"
          aria-label="Join the fight! Knight Hacks hackathon happening October 24th through 26th, 2025"
          className="mb-4 h-auto w-[70%] sm:w-[65%] md:mb-8 md:w-[55%] lg:w-[45%] xl:w-[40%] 2xl:w-[30%]"
        />
      </div>
      <div className="w-full flex items-center justify-center" style={{ opacity: 0, animation: 'slideInFromBottom 0.8s 0.8s ease-out forwards' }}>
        <RegisterButton url={registerUrl} />
      </div>
    </div>
  );
}
