import Image from "next/image";

const companies = [
  {
    name: "bny-mellon",
    logo: "/bny-mellon.svg",
  },
  {
    name: "ea",
    logo: "/ea.svg",
  },
  {
    name: "facebook",
    logo: "/facebook.svg",
  },
  {
    name: "geico",
    logo: "/geico.svg",
  },
  {
    name: "google-cloud",
    logo: "/google-cloud.svg",
  },
  {
    name: "ibm",
    logo: "/ibm.svg",
  },
  {
    name: "lockheed-martin",
    logo: "/lockheed-martin.svg",
  },
  {
    name: "microsoft",
    logo: "/microsoft.svg",
  },
  {
    name: "synopsys",
    logo: "/synopsys.svg",
  },
];

const SponsorsMarquee = () => {
  return (
    <>
      <div className="inline-flex w-full flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
        <ul className="animate-infinite-scroll my-12 flex items-center justify-center gap-20 md:justify-start [&_img]:max-w-none [&_li]:mx-8">
          {companies.map((logo, index) => (
            <li key={index}>
              <Image
                src={`/logos/${logo.name}.svg`}
                height={0}
                width={0}
                alt={"logo"}
                className="xs:w-20 xs:h-20 h-20 w-20 scale-90 rounded-md object-contain sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32 xl:h-40 xl:w-40"
              />
            </li>
          ))}
        </ul>
        <ul
          className="animate-infinite-scroll flex items-center justify-center gap-20 md:justify-start [&_img]:max-w-none [&_li]:mx-8"
          aria-hidden="true"
        >
          {companies.map((logo, index) => (
            <li key={index}>
              <Image
                src={`/logos/${logo.name}.svg`}
                height={0}
                width={0}
                alt={""}
                className="xs:w-20 xs:h-20 h-20 w-20 scale-90 rounded-md object-contain sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32 xl:h-40 xl:w-40"
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default SponsorsMarquee;
