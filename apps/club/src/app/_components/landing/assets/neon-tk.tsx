import type { SVGProps } from "react";
import * as React from "react";
import Image from "next/image";

const NeonTkSVG = React.memo((props: SVGProps<SVGSVGElement>) => {
  const { className } = props;
  return (
    <Image
      alt="neon-tk"
      width={120}
      height={60}
      src="neon-tk.svg"
      className={className}
    />
  );
});

export default NeonTkSVG;
