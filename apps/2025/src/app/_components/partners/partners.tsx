import React from "react";
import PartnersTitle from "./partnersTitle";
import PartnerPosters from "./partnerPosters";

const partners = () => {
  return (
    <div className="mb-16 sm:mb-20 md:mb-24 lg:mb-32 xl:mb-40 h-auto w-full">
      <PartnersTitle />
      <PartnerPosters />
    </div>
  );
};

export default partners; 