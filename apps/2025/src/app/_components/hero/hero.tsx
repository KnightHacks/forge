import HeroSVG from "./hero-svg";
import RegisterButton from "./register-button";

export default function Hero() {
  return (
    <div className="flex flex-col items-center space-y-6">
      <HeroSVG className="h-auto w-1/2 md:w-1/4" />
      <RegisterButton className="h-auto w-1/2 md:w-1/4" />
    </div>
  );
}
