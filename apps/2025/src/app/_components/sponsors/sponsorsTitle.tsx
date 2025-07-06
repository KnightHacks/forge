import React from "react";
import Image from "next/image";

const spikeything = "/sponsorSectionSvgs/spikeything.svg";

const sponsorsTitle = () => {
  return (
    <div className="relative z-10 h-auto w-full mb-2 sm:mb-3 md:mb-4 lg:mb-6 flex items-center justify-center">
      <div className="relative flex items-center justify-center w-[70%] sm:w-[65%] md:w-[60%] lg:w-[55%] xl:w-[50%]">
        <Image
          src={spikeything}
          alt="spikeything"
          width={0}
          height={0}
          sizes="100vw"
          className="z-10 h-[70%] w-[70%]"
        />
        <span
          className="absolute z-20 mt-[5%] text-[6vw] sm:text-[5vw] md:text-[4vw] lg:text-[3vw] xl:text-[2.5vw] text-[#1570AD]"
          style={{ fontFamily: '"The Last Shuriken"' }}
        >
          SPONSORS
        </span>
      </div>
    </div>
  );
};

export default sponsorsTitle;
