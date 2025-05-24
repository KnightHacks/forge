import AboutSVG from "./about-svg";
import GraphicSVG from "./graphic-svg";


export default function Hero() {
  return (
    <div className="w-full flex justify-center px-4">
      <div className="relative w-[99%] md:w-[60%]">
        <AboutSVG className="w-full h-auto my-[10%]" />
        <GraphicSVG />

      </div>
    </div>
  );
}
