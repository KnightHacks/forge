import Image from "next/image";
const sponsors = [
  { src: "/sponsorSectionSvgs/nasa.svg", alt: "NASA" },
  { src: "/sponsorSectionSvgs/nextera-energy.svg", alt: "NEXTERA" },
  { src: "/sponsorSectionSvgs/github-mark.svg", alt: "GITHUB" },
  { src: "/sponsorSectionSvgs/servicenow.svg", alt: "SERVICENOW" },
];
const sponsorScales: Record<string, string> = {
  NEXTERA: "scale-160 ml-1.5 xl:ml-6",
  NASA: "scale-140",
  SERVICENOW: "scale-190 ",
  default: "scale-120",
};

const sponsorPosters = () => {
  return (
    <div
      id="background"
      className="relative z-10 flex h-auto w-full justify-center"
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
