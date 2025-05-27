import AboutSVG from "./about-svg";
import AboutComicSVG from "./about-comic-svg";

export default function About() {
  return (
    <div className="flex w-full justify-center px-4 z-10">
      <div className="relative w-[99%] md:w-[60%]">
        <AboutSVG className="my-[10%] h-auto w-full" />
        <AboutComicSVG className="my-[10%] h-auto w-full" />
      </div>
    </div>
  );
}
