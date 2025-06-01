import HeroSVG from "./hero-svg";
import RegisterButton from "./register-button";

export default function Hero() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start pt-28 space-y-7 md:justify-center md:pt-0 md:space-y-6">
      <HeroSVG className="h-auto w-2/3 md:w-1/2 lg:w-1/3" />
      <RegisterButton />
    </div>
  );
}
