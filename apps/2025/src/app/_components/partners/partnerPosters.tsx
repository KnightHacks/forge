import Image from "next/image";

const partners = [
    { src: "/partnersSection/gwc.png", alt: "GWC" },
    { src: "/partnersSection/ieee.png", alt: "NEXTERA" },
    { src: "/partnersSection/mlh.svg", alt: "MLH" },
    { src: "/partnersSection/cecs.png", alt: "UCF" },
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
      <div className="mt-[5%] mb-[2%] grid w-[75%] grid-cols-2 place-items-center gap-x-4 gap-y-2 sm:gap-x-7 sm:gap-y-5">
        {partners.map((partner, index) => {
          const scale = partnerScales[partner.alt] || partnerScales.default;

          return (
            <div
              key={index}
              className="flex aspect-[190/230] w-full items-center justify-center bg-[#EDE6D9]"
            >
              <div className={`relative h-[40%] w-[40%] ${scale} `}>
                <Image
                  src={partner.src}
                  alt={partner.alt}
                  fill
                  className="object-contain"
                  unoptimized={true}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default partnerPosters; 