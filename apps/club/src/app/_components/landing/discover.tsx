import Image from "next/image";

import Counter from "./discover-assets/counter";
import DiscoverButton from "./discover-assets/discover-button";

export default function Discover() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-baseline gap-3">
          <Counter
            targetValue={127}
            className="font-pragati text-[48px] font-extrabold leading-none tracking-[0.05em] text-white [text-shadow:0px_0px_281.064px_#6B21A8,0px_0px_160.608px_#6B21A8,0px_0px_93.688px_#6B21A8,0px_0px_46.844px_#6B21A8,0px_0px_13.384px_#6B21A8,0px_0px_6.692px_#6B21A8] md:text-[80px]"
          />
          <span className="font-pragati text-[24px] font-bold tracking-[0.05em] text-white [text-shadow:0px_0px_281.064px_#6B21A8,0px_0px_160.608px_#6B21A8,0px_0px_93.688px_#6B21A8,0px_0px_46.844px_#6B21A8,0px_0px_13.384px_#6B21A8,0px_0px_6.692px_#6B21A8] md:text-[40px]">
            active members
          </span>
        </div>
        <p className="font-pragati text-center text-[28px] font-bold tracking-[0.05em] text-white [text-shadow:0px_0px_281.064px_#6B21A8,0px_0px_160.608px_#6B21A8,0px_0px_93.688px_#6B21A8,0px_0px_46.844px_#6B21A8,0px_0px_13.384px_#6B21A8,0px_0px_6.692px_#6B21A8] md:text-[48px]">
          Become one today
        </p>
      </div>
      <Image
        src="/tk.svg"
        alt="tk"
        width={0}
        height={0}
        className="h-auto w-auto"
      />
      <DiscoverButton text="Get Started on Blade!" className="w-[400px]" />
    </div>
  );
}
