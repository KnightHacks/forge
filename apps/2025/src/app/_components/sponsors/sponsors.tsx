import React from "react";
import SponsorsTitle from "./sponsorsTitle";
import SponsorPosters from "./sponsorPosters";

const sponsors = () => {
  return (
    <div className="mb-2 sm:mb-3 md:mb-4 lg:mb-6 xl:mb-8 h-auto w-full">
      <SponsorsTitle />
      <SponsorPosters />
    </div>
  );
};

export default sponsors;
