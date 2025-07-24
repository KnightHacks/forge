import type { SVGProps } from "react";
import Image from "next/image";
import React from "react";

const AboutComicSVG = React.memo((props: SVGProps<SVGSVGElement>) => {
  const { className } = props;
  return (
    <Image
      src="/about-graphic.svg"
      alt="Hackers Must Choose - Defeat Darkness, or Take Over the World!"
      width={3777}
      height={5758}
      className={className}
      priority={true}
      loading="eager"
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzc3NyIgaGVpZ2h0PSI1NzU4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4="
    />
  );
});

AboutComicSVG.displayName = 'AboutComicSVG';

export default AboutComicSVG;
