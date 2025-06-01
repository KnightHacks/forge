import Image from "next/image";
import Link from "next/link";

const sponsors = [
  { src: "/sponsorSectionSvgs/nasa.svg", alt: "NASA", link: "https://www.nasa.gov/" },
  { src: "/sponsorSectionSvgs/nextera-energy.svg", alt: "NEXTERA", link: "https://www.nexteraenergy.com/" },
  { src: "/sponsorSectionSvgs/github-mark.svg", alt: "GITHUB", link: "https://github.com/" },
  { src: "/sponsorSectionSvgs/servicenow.svg", alt: "SERVICENOW", link: "https://www.servicenow.com/" },
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
      <div className="mt-[5%] mb-[2%] grid w-[75%] lg:w-[60%] grid-cols-2 place-items-center gap-x-4 gap-y-2 sm:gap-x-7 sm:gap-y-5">
        {sponsors.map((sponsor, index) => {
          const scale = sponsorScales[sponsor.alt] || sponsorScales.default;

          return (
            <Link key={index} href={sponsor.link} passHref legacyBehavior>
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex aspect-[190/230] w-full items-center justify-center bg-[#F7F0C6] rounded-lg border border-gray-300 hover:shadow-2xl hover:shadow-amber-200/75 hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 z-0 bg-[repeating-linear-gradient(45deg,rgba(222,213,170,0.4)_0,rgba(222,213,170,0.4)_2px,transparent_2px,transparent_10px)]"></div>
                
                <div className={`relative z-10 h-[40%] w-[40%] ${scale} `}>
                  <Image
                    src={sponsor.src}
                    alt={sponsor.alt}
                    fill
                    className="object-contain"
                  />
                </div>
              </a>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default sponsorPosters;
