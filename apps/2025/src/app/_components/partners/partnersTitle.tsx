import Image from "next/image";

const spikeything = "/sponsorSectionSvgs/spikeything.svg";

const partnersTitle = () => {
  return (
    <div className="relative z-10 mb-1 flex h-auto w-full items-center justify-center sm:mb-2 md:mb-3 lg:mb-4">
      <div className="relative flex w-[70%] items-center justify-center sm:w-[65%] md:w-[60%] lg:w-[55%] xl:w-[50%]">
        <Image
          src={spikeything}
          alt="spikeything"
          width={0}
          height={0}
          sizes="100vw"
          className="z-10 h-[70%] w-[70%]"
        />
        <span
          className="absolute top-1/2 left-1/2 z-20 mt-[1%] -translate-x-1/2 -translate-y-1/2 transform text-[6vw] text-[#FBB03B] sm:text-[5vw] md:text-[4vw] lg:text-[3vw] xl:text-[2.5vw]"
          style={{ fontFamily: '"The Last Shuriken"' }}
        >
          PARTNERS
        </span>
      </div>
    </div>
  );
};

export default partnersTitle;
