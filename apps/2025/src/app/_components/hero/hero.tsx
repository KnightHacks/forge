import HeroSVG from "./hero-svg";
import RegisterButton from "./register-button";

export default function Hero() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-start pt-64 sm:pt-24 md:pt-28 lg:pt-32 space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-7 md:justify-center md:pt-0">
      <HeroSVG className="h-auto w-[85%] sm:w-[80%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%]" />
      <RegisterButton />
    </div>
  );
}
