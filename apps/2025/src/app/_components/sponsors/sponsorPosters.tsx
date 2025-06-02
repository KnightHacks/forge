import Image from "next/image";
import Link from "next/link";

const sponsors = [
  { src: "/sponsorSectionSvgs/nextera-energy.svg", alt: "NEXTERA", link: "https://www.nexteraenergy.com/", category: "Gold" },
  { src: "/sponsorSectionSvgs/servicenow.svg", alt: "SERVICENOW", link: "https://www.servicenow.com/", category: "Gold" },
  { src: "/sponsorSectionSvgs/nasa.svg", alt: "NASA", link: "https://www.nasa.gov/", category: "Silver" },
  { src: "/sponsorSectionSvgs/github-mark.svg", alt: "GITHUB", link: "https://github.com/", category: "Silver" },

];

const sponsorScales: Record<string, string> = {
  NEXTERA: "scale-160 ml-1.5 xl:ml-6",
  NASA: "scale-140",
  SERVICENOW: "scale-190 ",
  default: "scale-120",
};

const SPONSOR_CATEGORIES = {
  Platinum: {
    order: 1,
    itemClass: "lg:w-[70%]",
    logoScaleFactor: 1.2,
    borderColor: "border-slate-200",
    shadowColor: "hover:shadow-slate-200/70",
    borderAnimationClass: "platinum-border-animate"
  },
  Gold: {
    order: 2,
    itemClass: "lg:w-[65%]",
    logoScaleFactor: 1.1,
    borderColor: "border-yellow-400",
    shadowColor: "hover:shadow-yellow-400/70",
    bgShimmerClass: "",
    borderAnimationClass: ""
  },
  Silver: {
    order: 3,
    itemClass: "lg:w-[60%]",
    logoScaleFactor: 1.0,
    borderColor: "border-gray-400",
    shadowColor: "hover:shadow-gray-400/70",
    bgShimmerClass: "",
    borderAnimationClass: ""
  },
  Bronze: {
    order: 4,
    itemClass: "lg:w-[55%]",
    logoScaleFactor: 0.9,
    borderColor: "border-orange-400",
    shadowColor: "hover:shadow-orange-400/70",
    bgShimmerClass: "",
    borderAnimationClass: ""
  },
};

type SponsorCategory = keyof typeof SPONSOR_CATEGORIES;

const sponsorPosters = () => {
  const groupedSponsors = sponsors.reduce((acc, sponsor) => {
    const category = sponsor.category as SponsorCategory;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(sponsor);
    return acc;
  }, {} as Record<SponsorCategory, typeof sponsors>);

  const sortedCategories = Object.keys(groupedSponsors).sort(
    (a, b) => SPONSOR_CATEGORIES[a as SponsorCategory].order - SPONSOR_CATEGORIES[b as SponsorCategory].order
  ) as SponsorCategory[];

  return (
    <div
      id="background"
      className="relative z-10 flex w-full flex-col items-center justify-center"
    >
      {sortedCategories.map((category) => {
        const categoryConfig = SPONSOR_CATEGORIES[category];
        return (
          <div key={category} className="w-full mb-16">
            <div className={`mt-[2%] mb-[2%] grid w-[85%] sm:w-[75%] ${categoryConfig.itemClass} mx-auto grid-cols-1 place-items-center gap-x-6 gap-y-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-8`}>
              {(groupedSponsors[category] || []).map((sponsor, index) => {
                const baseScale = sponsorScales[sponsor.alt] || sponsorScales.default;
                return (
                  <Link key={index} href={sponsor.link} passHref legacyBehavior>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`relative flex aspect-[190/230] w-full items-center justify-center bg-[#EDE6D9] rounded-lg border-2 ${categoryConfig.borderColor} hover:shadow-2xl ${categoryConfig.shadowColor} hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden ${categoryConfig.borderAnimationClass || ''}`}
                    >
                      <div className="absolute inset-0 z-0 bg-[repeating-linear-gradient(45deg,rgba(222,213,170,0.4)_0,rgba(222,213,170,0.4)_2px,transparent_2px,transparent_10px)]"></div>
                      
                      <div className={`relative z-10 h-[40%] w-[40%] ${baseScale} `}>
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
      })}
    </div>
  );
};

export default sponsorPosters;
