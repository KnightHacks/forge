"use client";

import SponsorPosters from "./sponsorPosters";
import SponsorsTitle from "./sponsorsTitle";

const sponsors = () => {
  return (
    <div className="flex w-full justify-center">
      <div
        id="sponsors"
        className="mt-32 mb-8 h-auto w-[90%] sm:mt-40 sm:mb-12 md:mt-48 md:mb-16 lg:mt-64 lg:mb-20 xl:mt-80 xl:mb-24 animate-on-scroll"
        style={{ animation: 'fadeIn 0.8s ease-out forwards' }}
      >
        <SponsorsTitle />
        <SponsorPosters />
      </div>
    </div>
  );
};

export default sponsors;
