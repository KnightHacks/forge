"use client";

import useStaggeredAnimation from "../hooks/useStaggeredAnimation";
import PartnerPosters from "./partnerPosters";
import PartnersTitle from "./partnersTitle";

const Partners = () => {
  const partnersRef = useStaggeredAnimation(150);

  return (
    <div className="flex w-full justify-center">
      <div
        id="partners"
        ref={partnersRef}
        className="mb-16 h-auto w-[90%] sm:mb-20 md:mb-24 lg:mb-32 xl:mb-40"
      >
        <div className="stagger-item animate-pop-out">
          <PartnersTitle />
        </div>
        <div className="stagger-item" style={{ animationDelay: '0.5s' }}>
          <PartnerPosters />
        </div>
      </div>
    </div>
  );
};

export default Partners;
