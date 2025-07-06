import Image from "next/image";
import Link from "next/link";

const partners = [
    { src: "/partnersSection/gwc.png", alt: "GWC", link: "https://girlswhocode.com/" },
    { src: "/partnersSection/ieee.png", alt: "IEEE", link: "https://ieee.cecs.ucf.edu/" },
    { src: "/partnersSection/mlh.svg", alt: "MLH", link: "https://mlh.io/" },
    { src: "/partnersSection/cecs.png", alt: "UCF", link: "https://www.cecs.ucf.edu/" },
    
  ];

const partnerScales: Record<string, string> = {
  default: "scale-100 sm:scale-140 md:scale-160 lg:scale-180",
};

const partnerPosters = () => {
  return (
    <div
      id="background-partners"
      className="relative z-10 flex h-auto w-full justify-center"
    >
      <div className="mt-8 sm:mt-12 md:mt-16 lg:mt-20 mb-8 sm:mb-12 md:mb-16 lg:mb-20 grid md:flex w-[90%] sm:w-[80%] md:w-[70%] lg:w-[60%] xl:w-[50%] grid-cols-2 sm:grid-cols-2 md:flex-wrap lg:flex-wrap place-items-center md:justify-center md:items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        {partners.map((partner, index) => {
          const scale = partnerScales[partner.alt] || partnerScales.default;

          return (
            <Link key={index} href={partner.link} passHref legacyBehavior>
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex aspect-[190/230] w-full max-w-[200px] sm:max-w-[220px] md:max-w-[240px] lg:max-w-[260px] items-center justify-center bg-[#EDE6D9] rounded-lg border border-gray-300 hover:shadow-xl hover:shadow-red-500/60 hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 z-0 bg-[repeating-linear-gradient(45deg,rgba(222,213,170,0.4)_0,rgba(222,213,170,0.4)_2px,transparent_2px,transparent_10px)]"></div>
                <div className={`relative z-10 h-[60%] w-[60%] ${scale} `}>
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