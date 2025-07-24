import type { SVGProps } from "react";
import * as React from "react";
import Image from "next/image";

const HeroSVG = React.memo((props: SVGProps<SVGSVGElement>) => {
  const { className } = props;
  return (
    <Image
      alt="hero-icon"
      width={120}
      height={60}
      src="heroicon.svg"
      className={className}
    />
  );
});

export default HeroSVG;
