import type { SVGProps } from "react";
import Image from "next/image";
import React from "react";

const AboutComicSVG = React.memo((props: SVGProps<SVGSVGElement>) => {
  const { className } = props;
  return (
    <Image
      src="about-graphic.svg"
      alt="Hackers Must Choose - Defeat Darkness, or Take Over the World!"
      width={3777}
      height={5758}
      className={className}
    ></Image>
  );
});

export default AboutComicSVG;
