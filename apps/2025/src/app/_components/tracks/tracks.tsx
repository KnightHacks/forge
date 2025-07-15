import TextBox from "../textbox";
import Comic from "./comic";

export default function Tracks() {
  return (
    <div
      id="tracks"
      className="z-10 my-2 mb-4 flex flex-col items-center space-y-1 overflow-x-hidden sm:my-3 sm:mb-6 sm:space-y-2 md:my-4 md:mb-8 md:space-y-3 lg:my-6 lg:mb-12 lg:space-y-4 xl:my-8 xl:mb-16"
    >
      <div className="flex w-full flex-col items-center pt-8 sm:pt-12 md:pt-16 lg:pt-20 xl:pt-24">
        {/* Textbox positioned above comic and shifted left */}
        <div className="relative mb-2 w-[70%] sm:mb-3 md:mb-4 md:w-[60%] lg:mb-6 lg:w-[55%] xl:w-[50%]">
          <div className="-translate-x-[22%] scale-90 transform md:-translate-x-[20%] lg:-translate-x-[23%] lg:scale-75 xl:-translate-x-[25%]">
            <TextBox
              width="100%"
              height="80%"
              textSize="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl"
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
        <Comic className="h-auto w-[98%] sm:w-[90%] md:w-[65%] lg:w-[55%] xl:w-[50%]" />
      </div>
    </div>
  );
}
