import Comic from "./comic";
import TracksTitleSVG from "./tracks-title-svg";

export default function Tracks() {
  return (
    <div className="my-[7%] flex flex-col items-center space-y-6 overflow-x-hidden z-10 mb-25">
      <div className="mb-0 ml-[6%] w-[60%] self-start md:ml-[36%] md:w-[115%] md:self-auto">
        <TracksTitleSVG className="h-auto w-[99%] md:w-[50%]" />
      </div>
      <Comic className="h-auto w-[99%] md:w-[90%]" />
    </div>
  );
}
