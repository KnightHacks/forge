import Comic from "./comic";
import TextBox from "../textbox";

export default function Tracks() {
  return (
    <div className="my-2 sm:my-3 md:my-4 lg:my-6 xl:my-8 flex flex-col items-center space-y-1 sm:space-y-2 md:space-y-3 lg:space-y-4 overflow-x-hidden z-10 mb-4 sm:mb-6 md:mb-8 lg:mb-12 xl:mb-16">
      <div className="mb-0 w-full px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="flex items-start w-full sm:w-4/5 md:w-3/4 lg:w-2/3 mt-1 sm:mt-2 md:mt-3 lg:mt-4 lg:ml-4 sm:lg:ml-6 md:lg:ml-8 lg:ml-10">
          <TextBox width="100%" height="100%" textSize="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl" centering="text-start" className="mb-2 sm:mb-3 md:mb-4 lg:mb-6">
            <p>
              <em><strong>In battle, explore our tracks, such as</strong></em>
            </p>
          </TextBox>
        </div>
      </div>
      <Comic className="h-auto w-[75%] sm:w-[70%] md:w-[65%] lg:w-[60%] xl:w-[55%]" />
    </div>
  );
}
