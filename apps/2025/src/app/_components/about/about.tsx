"use client";

import useScrollAnimation from "~/hooks/useScrollAnimation";
import AboutComicSVG from "./about-comic-svg";
import AboutText from "./about-text";

export default function About() {
  const aboutTextRef = useScrollAnimation("animate-slide-in-left");
  const aboutComicRef = useScrollAnimation("animate-slide-in-right");

  return (
    <section
      id="about"
      className="z-10 mt-0 mb-37.5 flex min-h-300 w-full justify-center px-4 pt-0 sm:mb-0 sm:min-h-0 sm:px-6 sm:pt-8 md:px-8 md:pt-8 lg:px-12 lg:pt-12"
    >
      <div className="relative w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%]">
        <h2 className="sr-only">About Knight Hacks</h2>
        <div ref={aboutTextRef} className="hover-lift animate-on-scroll">
          <AboutText />
        </div>
        <div
          ref={aboutComicRef}
          className="hover-lift animate-on-scroll my-8 flex justify-center sm:my-12 md:my-16 lg:my-20 xl:my-24"
        >
          <AboutComicSVG
            aria-label="Hackers Must Choose - Defeat Darkness, or Take Over the World!"
            className="h-auto sm:w-[93%] md:w-[91%] lg:w-[89%] xl:w-[87%] 2xl:w-[80%]"
          />
        </div>
      </div>
    </section>
  );
}
