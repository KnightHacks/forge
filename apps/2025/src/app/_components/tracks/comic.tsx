import type { SVGProps } from "react";
import Image from "next/image";
import React from "react";

const Comic = React.memo((props: SVGProps<SVGSVGElement>) => {
  const { className } = props;
  return (
    <Image
      src="/comic.svg"
      alt="Choose from Our Hacker Tracks - Hello World, Artificial Intelligence / Machine Learning, App Development, Game Development, and Embedded Software!"
      width={3777}
      height={5758}
      className={className}
      priority={false}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzc3NyIgaGVpZ2h0PSI1NzU4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4="
    />
  );
});

Comic.displayName = 'Comic';

export default Comic;
