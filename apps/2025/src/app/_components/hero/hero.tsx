import HeroClient from "./hero-client";
import { env } from "~/env";

export default function Hero() {
  const registerUrl = env.BLADE_URL + "hacker/application/knighthacks-viii";
  
  return <HeroClient registerUrl={registerUrl} />;
}
