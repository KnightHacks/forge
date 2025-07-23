import type { SVGProps } from "react";
import Image from "next/image";
import React from "react";

const KnightHacksSVG = React.memo((props: SVGProps<SVGSVGElement>) => {
  const { className } = props;
  return (
    <Image
      src="Kh2025.svg"
      alt="Join the fight! Knight Hacks hackathon happening October 24th through 26th, 2025"
      width={200}
      height={1000}
      className={className}
    ></Image>
  );
});

export default KnightHacksSVG;
