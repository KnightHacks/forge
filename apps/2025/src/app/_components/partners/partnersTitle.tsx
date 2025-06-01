import React from "react";
import Image from "next/image";


const spikeything = "/sponsorSectionSvgs/spikeything.svg";

const partnersTitle = () => {
  return (
    <div className="relative z-10 h-auto w-full mb-8 flex items-center justify-center">
      <div className="relative flex items-center justify-center">
        <Image
          src={spikeything}
          alt="spikeything"
          width={0}
          height={0}
          sizes="100vw"
          className="z-10 h-[90%] w-[90%]"
        />
        <span
          className="absolute z-20 mt-[5%] text-[10vw] text-[#FBB03B]"
          style={{ fontFamily: '"The Last Shuriken"' }}
        >
          PARTNERS
        </span>
      </div>
    </div>
  );
};

export default partnersTitle; 