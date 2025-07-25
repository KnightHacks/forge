import HeroSVG from "./hero-svg";
import KnightHacksSVG from "./knight-hacks-svg";
import RegisterButton from "./register-button";
import { env } from "~/env";

export default function Hero() {
  const registerUrl = env.BLADE_URL + "hacker/application/knighthacks-viii";
  return (
    <div className="flex h-screen flex-col items-center justify-center relative animate-on-scroll" style={{ animation: 'fadeIn 0.8s ease-out forwards' }}>
      <div className="relative w-full flex items-center justify-center animate-slide-in-left" style={{ zIndex: 1 }}>
        <KnightHacksSVG
          role="img"
          aria-label="Knight Hacks 2025 - Official Hackathon Logo"
          className="h-auto w-[70%] sm:w-[65%] md:w-[55%] lg:w-[45%] xl:w-[40%] 2xl:w-[30%]"
        />
      </div>
      <div className="w-full flex items-center justify-center animate-on-scroll" style={{ animation: 'fadeIn 0.8s 0.15s ease-out forwards' }}>
        <HeroSVG
          role="img"
          aria-label="Join the fight! Knight Hacks hackathon happening October 24th through 26th, 2025"
          className="mb-4 h-auto w-[70%] sm:w-[65%] md:mb-8 md:w-[55%] lg:w-[45%] xl:w-[40%] 2xl:w-[30%]"
        />
      </div>
      <div className="w-full flex items-center justify-center animate-on-scroll" style={{ animation: 'fadeIn 0.8s 0.3s ease-out forwards' }}>
        <RegisterButton url={registerUrl} />
      </div>
    </div>
  );
}
