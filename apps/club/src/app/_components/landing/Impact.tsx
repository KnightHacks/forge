"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Expandable from "./impact-assets/animata/expandable";

export default function Impact() {
  gsap.registerPlugin(useGSAP, ScrollTrigger);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const expandableRef = useRef<HTMLDivElement | null>(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: headerRef.current,
        start: "top 80%",
        end: "bottom 20%",
        scrub: false,
      },
    });

    tl.fromTo(
      headerRef.current,
      { opacity: 0, y: -50 },
      { opacity: 1, y: 0, duration: 1 },
    );

    tl.fromTo(
      expandableRef.current,
      { opacity: 0, x: -50 },
      { opacity: 1, y: 0, duration: 1 },
    );
  });

  return (
    <div>
      <div className="my-2 flex h-screen max-h-screen flex-col items-center justify-center">
        <p
          ref={headerRef}
          className="font-pragati mb-2 text-center text-[30px] font-bold leading-[102px] tracking-[0.05em] text-white [text-shadow:0px_0px_281.064px_#6B21A8,0px_0px_160.608px_#6B21A8,0px_0px_93.688px_#6B21A8,0px_0px_46.844px_#6B21A8,0px_0px_13.384px_#6B21A8,0px_0px_6.692px_#6B21A8] md:text-[60px]"
        >
          How we make an{" "}
          <span className="font-poppins text-center text-[40px] font-semibold leading-[120px] tracking-[0.05em] text-white md:h-[110px] md:w-[733px] md:text-[80px]">
            IMPACT
          </span>
        </p>
        <div
          ref={expandableRef}
          className="flex h-[600px] w-2/3 items-center justify-center"
        >
          <Expandable />
        </div>
      </div>
    </div>
  );
}
