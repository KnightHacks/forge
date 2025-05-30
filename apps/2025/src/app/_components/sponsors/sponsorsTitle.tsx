import React from "react";
import Image from "next/image";

const sideWalk = "./sponsorSectionSvgs/sidewalk.svg";
const spikeything = "./sponsorSectionSvgs/spikeything.svg";
const sponsorsTitle = () => {
  return (
    <div className="relative z-10 h-auto w-full bg-amber-300">
      <Image
        src={sideWalk}
        alt="Sidewalk"
        width={0}
        height={0}
        sizes="100vw"
        objectFit="cover"
        className="z-0 h-auto w-full"
      />

      <div className="absolute inset-0 top-0 left-0 flex items-center justify-center">
        <Image
          src={spikeything}
          alt="spikeything"
          width={0}
          height={0}
          sizes="100vw"
          objectFit="cover"
          className="z-10 h-auto w-full"
        />
        <div className="absolute z-20 font-bold text-blue-600">Sponsors</div>
      </div>
    </div>
  );
};

export default sponsorsTitle;
