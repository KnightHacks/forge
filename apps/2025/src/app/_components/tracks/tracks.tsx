import Comic from "./comic";
import TracksTitleSVG from "./tracks-title-svg";
import TextBox from "../textbox";

export default function Tracks() {
  return (
    <div className="my-[7%] flex flex-col items-center space-y-6 overflow-x-hidden z-10 mb-25">
      <div className="mb-0 w-full px-4 md:px-8">
        <TracksTitleSVG className="h-auto w-full md:w-[50%]" />
        <div className="flex items-start w-4/5">
          <TextBox width="100%" height="100%" textSize="text-sm sm:text-md md:text-xl lg:text-3xl" centering="text-start" className="mb-8 sm:mb-12 md:mb-16">
            <p>
              <em><strong>In battle, explore our tracks, such as</strong></em>
            </p>
          </TextBox>
        </div>
      </div>
      <Comic className="h-auto w-[99%] md:w-[90%]" />
    </div>
  );
}
