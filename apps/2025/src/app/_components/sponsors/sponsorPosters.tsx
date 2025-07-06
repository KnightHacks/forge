import Image from "next/image";
import Link from "next/link";

const sponsors = [
  { src: "/sponsorSectionSvgs/oneethos.png", alt: "ONEETHOS", link: "https://oneethos.com/", category: "Platinum" },
  { src: "/sponsorSectionSvgs/nextera-energy.svg", alt: "NEXTERA", link: "https://www.nexteraenergy.com/", category: "Gold" },
  { src: "/sponsorSectionSvgs/servicenow.svg", alt: "SERVICENOW", link: "https://www.servicenow.com/", category: "Gold" },
  { src: "/sponsorSectionSvgs/BNY-logo.svg", alt: "BNY", link: "https://www.bnymellon.com/", category: "Gold" },
  { src: "/sponsorSectionSvgs/nasa.svg", alt: "NASA", link: "https://www.nasa.gov/", category: "Silver" },
  { src: "/sponsorSectionSvgs/github-mark.svg", alt: "GITHUB", link: "https://github.com/", category: "Silver" },

];

const sponsorScales: Record<string, string> = {
  ONEETHOS: "scale-100 sm:scale-150 md:scale-170 lg:scale-175",
  NEXTERA: "scale-100 sm:scale-140 md:scale-160 lg:scale-180 xl:ml-6",
  NASA: "scale-100 sm:scale-130 md:scale-140 lg:scale-160",
  SERVICENOW: "scale-100 sm:scale-150 md:scale-170 lg:scale-180",
  BNY: "scale-100 sm:scale-130 md:scale-140 lg:scale-160",
  default: "scale-100 sm:scale-130 md:scale-140",
};

const SPONSOR_CATEGORIES = {
  Platinum: {
    order: 1,
    itemClass: "w-full sm:w-[90%] md:w-[80%] lg:w-[70%]",
    logoScaleFactor: 1.2,
    borderColor: "border-slate-200",
    shadowColor: "hover:shadow-slate-200/70",
  },
  Gold: {
    order: 2,
    itemClass: "w-full sm:w-[85%] md:w-[75%] lg:w-[65%]",
    logoScaleFactor: 1.1,
    borderColor: "border-yellow-400",
    shadowColor: "hover:shadow-yellow-400/70",
  },
  Silver: {
    order: 3,
    itemClass: "w-full sm:w-[80%] md:w-[70%] lg:w-[60%]",
    logoScaleFactor: 1.0,
    borderColor: "border-gray-400",
    shadowColor: "hover:shadow-gray-400/70",
  },
  Bronze: {
    order: 4,
    itemClass: "w-full sm:w-[75%] md:w-[65%] lg:w-[55%]",
    logoScaleFactor: 0.9,
    borderColor: "border-orange-400",
    shadowColor: "hover:shadow-orange-400/70",
  },
};

type SponsorCategory = keyof typeof SPONSOR_CATEGORIES;

const sponsorPosters = () => {
  const initialStateForReduce: Record<SponsorCategory, (typeof sponsors)[0][]> =
    (Object.keys(SPONSOR_CATEGORIES) as SponsorCategory[]).reduce((obj, key) => {
      obj[key] = [];
      return obj;
    }, {} as Record<SponsorCategory, (typeof sponsors)[0][]>);

  const groupedSponsors = sponsors.reduce((acc, sponsor) => {
    const category = sponsor.category as SponsorCategory;
    if (Object.prototype.hasOwnProperty.call(acc, category)) {
      acc[category].push(sponsor);
    }
    return acc;
  }, initialStateForReduce);

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
        const sponsorCount = groupedSponsors[category].length;
        const isOdd = sponsorCount % 2 === 1;
        
        return (
          <div key={category} className="w-full mb-4 sm:mb-6 md:mb-8 lg:mb-10">
            <div className={`mt-8 sm:mt-12 md:mt-16 lg:mt-20 mb-4 sm:mb-6 md:mb-8 lg:mb-10 grid md:flex w-[85%] sm:w-[80%] md:${categoryConfig.itemClass.split(' ')[1]} lg:${categoryConfig.itemClass.split(' ')[2]} mx-auto grid-cols-2 sm:grid-cols-2 md:flex-wrap lg:flex-wrap place-items-center md:justify-center md:items-center gap-4 sm:gap-6 md:gap-8 lg:gap-10`}>
              {(groupedSponsors[category]).map((sponsor, index) => {
                const baseScale = sponsorScales[sponsor.alt] || sponsorScales.default;
                const isLastOdd = isOdd && index === sponsorCount - 1;
                
                return (
                  <Link key={index} href={sponsor.link} passHref legacyBehavior>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`relative flex aspect-[190/230] w-full max-w-[200px] sm:max-w-[220px] md:max-w-[240px] lg:max-w-[260px] items-center justify-center bg-[#EDE6D9] rounded-lg border-2 ${categoryConfig.borderColor} hover:shadow-2xl ${categoryConfig.shadowColor} hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden ${
                        isLastOdd ? 'col-span-2 sm:col-span-2 md:col-span-auto' : ''
                      }`}
                    >
                      <div className="absolute inset-0 z-0 bg-[repeating-linear-gradient(45deg,rgba(222,213,170,0.4)_0,rgba(222,213,170,0.4)_2px,transparent_2px,transparent_10px)]"></div>
                      
                      <div className={`relative z-10 h-[55%] w-[55%] ${baseScale} `}>
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
