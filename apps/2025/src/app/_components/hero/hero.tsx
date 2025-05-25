import HeroSVG from "./hero-svg";
import RegisterButton from "./register-button";
import { env } from "~/env";

export default function Hero() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-6">
      <HeroSVG className="h-auto w-1/2 md:w-1/3" />
      <a
        href={`${env.BLADE_URL}/hacker/application`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex justify-center"
      >
        <RegisterButton className="h-auto w-1/2 md:w-1/4" />
      </a>
    </div>
  );
}
