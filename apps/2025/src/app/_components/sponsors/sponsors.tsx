"use client";

import useStaggeredAnimation from "../hooks/useStaggeredAnimation";
import SponsorPosters from "./sponsorPosters";
import SponsorsTitle from "./sponsorsTitle";

const Sponsors = () => {
  const sponsorsRef = useStaggeredAnimation(150);

  return (
    <div className="flex w-full justify-center">
      <section
        id="sponsors"
        ref={sponsorsRef}
        className="mt-32 mb-8 h-auto w-[90%] sm:mt-40 sm:mb-12 md:mt-48 md:mb-16 lg:mt-64 lg:mb-20 xl:mt-80 xl:mb-24"
      >
        <div className="stagger-item animate-pop-out">
          <SponsorsTitle />
        </div>
        <div className="stagger-item" style={{ animationDelay: '0.5s' }}>
          <SponsorPosters />
        </div>
      </section>
    </div>
  );
};

export default Sponsors;
