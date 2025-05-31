import Image from "next/image";
const sponsors = [
  { src: "/sponsorSectionSvgs/google-logo.svg", alt: "Google" },
  { src: "/sponsorSectionSvgs/microsoft-logo.svg", alt: "Microsoft" },
  { src: "/sponsorSectionSvgs/ibm-logo.svg", alt: "IBM" },
  { src: "/sponsorSectionSvgs/nvidia-logo.svg", alt: "NVIDIA" },
  { src: "/sponsorSectionSvgs/ea-logo.svg", alt: "EA" },
  { src: "/sponsorSectionSvgs/meta-logo.svg", alt: "Meta" },
];
const sponsorScales: Record<string, string> = {
  IBM: "scale-175",
  NVIDIA: "scale-200",
  default: "scale-100",
};

const sponsorPosters = () => {
  return (
    <div
      id="background"
      className="relative z-10 flex h-auto w-full justify-center bg-[#0F131A]"
    >
      <div className="mt-[5%] mb-[2%] grid w-[75%] grid-cols-2 place-items-center gap-x-4 gap-y-2 sm:gap-x-7 sm:gap-y-5">
        {sponsors.map((sponsor, index) => {
          const scale = sponsorScales[sponsor.alt] || sponsorScales.default;

          return (
            <div
              key={index}
              className="flex aspect-[190/230] w-full items-center justify-center bg-[#EDE6D9]"
            >
              <div className={`relative h-[40%] w-[40%] ${scale} `}>
                <Image
                  src={sponsor.src}
                  alt={sponsor.alt}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default sponsorPosters;
