import SponsorsMarquee from "./sponsors-assets/sponsor-marquee";

export default function Sponsors() {
  return (
    <div className="my-5 flex h-[70vh] flex-col justify-center">
      <p className="font-pragati mb-2 text-center text-[25px] font-bold leading-[102px] tracking-[0.05em] text-white [text-shadow:0px_0px_281.064px_#6B21A8,0px_0px_160.608px_#6B21A8,0px_0px_93.688px_#6B21A8,0px_0px_46.844px_#6B21A8,0px_0px_13.384px_#6B21A8,0px_0px_6.692px_#6B21A8] md:text-[50px]">
        {" "}
        Trusted by top companies{" "}
      </p>
      <SponsorsMarquee />
    </div>
  );
}
