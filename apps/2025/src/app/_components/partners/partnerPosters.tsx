import Image from "next/image";
import Link from "next/link";

const partners = [
    { src: "/partnersSection/gwc.png", alt: "GWC", link: "https://girlswhocode.com/" },
    { src: "/partnersSection/ieee.png", alt: "IEEE", link: "https://ieee.cecs.ucf.edu/" },
    { src: "/partnersSection/mlh.svg", alt: "MLH", link: "https://mlh.io/" },
    { src: "/partnersSection/cecs.png", alt: "UCF", link: "https://www.cecs.ucf.edu/" },
  ];

const partnerScales: Record<string, string> = {
  default: "scale-120",
};

const partnerPosters = () => {
  return (
    <div
      id="background-partners"
      className="relative z-10 flex h-auto w-full justify-center"
    >
      <div className="mt-[5%] mb-[2%] grid w-[75%] lg:w-[60%] grid-cols-2 place-items-center gap-x-4 gap-y-2 sm:gap-x-7 sm:gap-y-5">
        {partners.map((partner, index) => {
          const scale = partnerScales[partner.alt] || partnerScales.default;

          return (
            <Link key={index} href={partner.link} passHref legacyBehavior>
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex aspect-[190/230] w-full items-center justify-center bg-[#F7F0C6] rounded-lg border border-gray-300 hover:shadow-2xl hover:shadow-amber-200/75 hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 z-0 bg-[repeating-linear-gradient(45deg,rgba(222,213,170,0.4)_0,rgba(222,213,170,0.4)_2px,transparent_2px,transparent_10px)]"></div>
                <div className={`relative z-10 h-[40%] w-[40%] ${scale} `}>
                  <Image
                    src={partner.src}
                    alt={partner.alt}
                    fill
                    className="object-contain"
                    unoptimized={true}
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

export default partnerPosters; 