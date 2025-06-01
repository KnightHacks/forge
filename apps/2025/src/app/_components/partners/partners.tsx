import React from "react";
import PartnersTitle from "./partnersTitle";
import PartnerPosters from "./partnerPosters";

const partners = () => {
  return (
    <div className="mb-48 h-auto w-full lg:mb-[28%]">
      <PartnersTitle />
      <PartnerPosters />
    </div>
  );
};

export default partners; 