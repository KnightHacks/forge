import React from "react";
import SponsorsTitle from "./sponsorsTitle";
import SponsorPosters from "./sponsorPosters";

const sponsors = () => {
  return (
    <div className="mb-24 h-auto w-full lg:mb-24">
      <SponsorsTitle />
      <SponsorPosters />
    </div>
  );
};

export default sponsors;
