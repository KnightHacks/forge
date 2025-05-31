import React from "react";
import SponsorsTitle from "./sponsorsTitle";
import SponsorPosters from "./sponsorPosters";

const sponsors = () => {
  return (
    <div className="h-auto w-full bg-amber-400">
      <SponsorsTitle />
      <SponsorPosters />
    </div>
  );
};

export default sponsors;
