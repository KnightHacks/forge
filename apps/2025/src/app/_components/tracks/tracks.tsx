import Comic from "./comic";
import TracksTitleSVG from "./tracks-title-svg";

export default function Tracks() {
  return (
    <div className="flex flex-col items-center space-y-6 overflow-x-hidden my-[7%]">
        <div className="ml-[6%] md:ml-[36%] self-start md:self-auto mb-0 md:w-[115%] w-[60%]">
          <TracksTitleSVG className="h-auto w-[99%] md:w-[50%]"/>
        </div>
        <Comic className="h-auto w-[99%] md:w-[90%]" />
    </div>
  );
}
