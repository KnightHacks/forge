import type { SVGProps } from "react";
import * as React from "react";
import Image from "next/image";

const SwordSVG = React.memo((props: SVGProps<SVGSVGElement>) => {
  const { className } = props;
  return (
    <Image
      alt="sword"
      width={120}
      height={60}
      src="sword.svg"
      className={className}
    />
  );
});

export default SwordSVG;
