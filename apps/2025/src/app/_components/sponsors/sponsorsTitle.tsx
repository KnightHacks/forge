import React from "react";
import Image from "next/image";

const sideWalk = "/sponsorSectionSvgs/sidewalk.svg";
const spikeything = "/sponsorSectionSvgs/spikeything.svg";
const sponsorsTitle = () => {
  return (
    <div className="relative z-10 h-auto w-full">
      <Image
        src={sideWalk}
        alt="Sidewalk"
        width={0}
        height={0}
        sizes="100vw"
        className="z-0 h-auto w-full"
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute flex items-center justify-center">
          <Image
            src={spikeything}
            alt="spikeything"
            width={0}
            height={0}
            sizes="100vw"
            className="z-10 h-[90%] w-[90%]"
          />
          <span
            className="absolute z-20 mt-[5%] text-[10vw] text-[#1570AD]"
            style={{ fontFamily: '"The Last Shuriken"' }}
          >
            SPONSORS
          </span>
        </div>
      </div>
    </div>
  );
};

export default sponsorsTitle;
