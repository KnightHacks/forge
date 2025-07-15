import SponsorPosters from "./sponsorPosters";
import SponsorsTitle from "./sponsorsTitle";

const sponsors = () => {
  return (
    <div
      id="sponsors"
      className="mb-8 h-auto w-full pt-32 sm:mb-12 sm:pt-40 md:mb-16 md:pt-48 lg:mb-20 lg:pt-64 xl:mb-24 xl:pt-80"
    >
      <SponsorsTitle />
      <SponsorPosters />
    </div>
  );
};

export default sponsors;
