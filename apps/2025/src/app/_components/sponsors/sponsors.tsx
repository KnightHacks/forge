"use client";

import useStaggeredAnimation from "~/hooks/useStaggeredAnimation";
import SponsorPosters from "./sponsorPosters";
import SponsorsTitle from "./sponsorsTitle";

const Sponsors = () => {
  const sponsorsRef = useStaggeredAnimation(150);

  return (
    <div className="flex w-full justify-center">
      <section
        id="sponsors"
        ref={sponsorsRef}
        className="mt-0 mb-[100px] min-h-[800px] w-[90%] pt-0 sm:mt-40 sm:mb-20 sm:min-h-0 sm:pt-0 md:mb-24 lg:mb-32 xl:mb-40"
      >
        <div className="stagger-item animate-pop-out">
          <SponsorsTitle />
        </div>
        <div className="stagger-item" style={{ animationDelay: "0.5s" }}>
          <SponsorPosters />
        </div>
      </section>
    </div>
  );
};

export default Sponsors;
