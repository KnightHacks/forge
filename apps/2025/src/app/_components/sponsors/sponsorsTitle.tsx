import Image from "next/image";

const spikeything = "/sponsorSectionSvgs/spikeything.svg";

const SponsorsTitle = () => {
  return (
    <div className="relative z-10 mb-2 flex h-auto w-full items-center justify-center sm:mb-3 md:mb-4 lg:mb-6">
      <div className="relative flex w-[100%] items-center justify-center sm:w-[95%] md:w-[75%] lg:w-[70%] xl:w-[65%]">
        <Image
          src={spikeything}
          alt="spikeything"
          width={0}
          height={0}
          sizes="100vw"
          className="z-10 h-[80%] w-[80%] md:h-[60%] md:w-[60%]"
        />
        <span
          className="absolute top-1/2 left-1/2 z-20 mt-[1%] -translate-x-1/2 -translate-y-1/2 transform text-[6vw] text-[#1570AD] sm:text-[5vw] md:text-[4vw] lg:text-[3vw] xl:text-[3.3vw]"
          style={{ fontFamily: '"The Last Shuriken"' }}
        >
          SPONSORS
        </span>
      </div>
    </div>
  );
};

export default SponsorsTitle;
