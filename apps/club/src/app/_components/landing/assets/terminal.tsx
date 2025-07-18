import type { SVGProps } from "react";
import * as React from "react";
import Image from "next/image";

const TerminalSVG = React.memo((props: SVGProps<SVGSVGElement>) => {
  const { className, ...rest } = props;
  return (
    <Image
      alt="terminal"
      width={120}
      height={60}
      src="terminal.svg"
      className={className}
    />
  );
});

export default TerminalSVG;
