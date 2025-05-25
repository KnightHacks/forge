import HeroSVG from "./hero-svg";
import RegisterButton from "./register-button";

export default function Hero() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-6">
      <HeroSVG className="h-auto w-1/2 md:w-1/3" />
      <RegisterButton />
    </div>
  );
}
