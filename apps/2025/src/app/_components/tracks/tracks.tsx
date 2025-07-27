"use client";

import useScrollAnimation from "../hooks/useScrollAnimation";
import TextBox from "../textbox";
import Comic from "./comic";

export default function Tracks() {
  const tracksRef = useScrollAnimation("animate-slide-in-left");

  return (
    <section
      id="tracks"
      ref={tracksRef}
      className="z-10 mt-0 pt-0 mb-[200px] flex flex-col items-center space-y-1 overflow-x-hidden sm:my-3 sm:mb-6 sm:space-y-2 md:my-4 md:mb-8 md:space-y-3 lg:my-6 lg:mb-12 lg:space-y-4 xl:my-8 xl:mb-16 animate-on-scroll"
    >
      <div className="flex w-full flex-col items-center sm:min-h-0 pt-0 sm:pt-12 md:pt-16 lg:pt-20 xl:pt-24">
        <div className="relative w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%]">
          <h2 className="sr-only">Hackathon Tracks</h2>
          <div className="relative -mb-2 w-full hover-lift">
            <div className="transform scale-75 sm:scale-75 md:-translate-x-[8%] md:scale-75 lg:-translate-x-[10%] lg:scale-65 xl:-translate-x-[12%] xl:scale-65">
              <TextBox
                width="100%"
                height="80%"
                textSize="text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl"
                centering="text-start"
                className=""
              >
                <p>
                  <em>
                    <strong>In battle, explore our tracks, such as</strong>
                  </em>
                </p>
              </TextBox>
            </div>
          </div>

          {/* Comic centered */}
          <div className="-mt-2 flex justify-center hover-lift">
            <Comic
              aria-label="Choose from Our Hacker Tracks - Hello World, Artificial Intelligence / Machine Learning, App Development, Game Development, and Embedded Software!"
              className="h-auto w-[95%] sm:w-[90%] md:w-[89%] lg:w-[87%] xl:w-[85%] 2xl:w-[80%]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
