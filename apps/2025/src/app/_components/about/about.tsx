import AboutSVG from "./about-svg";
import AboutComicSVG from "./about-comic-svg";
import Logo from "../logo";

export default function About() {
  return (
    <div className="z-10 flex w-full justify-center px-4">
      <div className="relative w-[99%] md:w-[60%]">
        <AboutSVG className="mt-4 mb-[10%] h-auto w-full md:my-[10%]" />
        <AboutComicSVG className="my-[10%] h-auto w-full" />
      </div>
    </div>
  );
}
