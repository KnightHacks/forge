"use client";

import useStaggeredAnimation from "~/hooks/useStaggeredAnimation";
import PartnerPosters from "./partnerPosters";
import PartnersTitle from "./partnersTitle";

const Partners = () => {
  const partnersRef = useStaggeredAnimation(150);

  return (
    <div className="flex w-full justify-center">
      <section
        id="partners"
        ref={partnersRef}
        className="mt-0 mb-25 min-h-200 w-[90%] pt-0 sm:mt-40 sm:mb-20 sm:min-h-0 sm:pt-0 md:mb-24 lg:mb-32 xl:mb-40"
      >
        <div className="stagger-item animate-pop-out">
          <PartnersTitle />
        </div>
        <div className="stagger-item" style={{ animationDelay: "0.5s" }}>
          <PartnerPosters />
        </div>
      </section>
    </div>
  );
};

export default Partners;
