import AboutComicSVG from "./about-comic-svg";
import AboutText from "./about-text";

export default function About() {
  return (
    <div id="about" className=" z-10 flex w-full justify-center px-4 sm:px-6 md:px-8 lg:px-12">
      <div className="relative w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%]">
        <AboutText />
        <AboutComicSVG className="my-8 sm:my-12 md:my-16 lg:my-20 xl:my-24 h-auto w-full" />
      </div>
    </div>
  );
}
