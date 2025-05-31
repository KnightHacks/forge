import React from "react";
import SponsorsTitle from "./sponsorsTitle";
import SponsorPosters from "./sponsorPosters";

const sponsors = () => {
  return (
    <div className="mb-48 h-auto w-full lg:mb-[28%]">
      <SponsorsTitle />
      <SponsorPosters />
    </div>
  );
};

export default sponsors;
