import AboutComicSVG from "./about-comic-svg";
import AboutText from "./about-text";

export default function About() {
  return (
    <div className="z-10 flex w-full justify-center px-4">
      <div className="relative w-[99%] md:w-[60%]">
        <AboutText />
        <AboutComicSVG className="my-[10%] h-auto w-full" />
      </div>
    </div>
  );
}
