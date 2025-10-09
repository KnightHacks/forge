import Image from "next/image";
import React from "react";

const Logo = React.memo(
  ({ size, className }: { size: number; className?: string }) => {
    return (
      <Image
        src="logo.svg"
        alt="logo"
        width={size}
        height={size}
        className={className}
      />
    );
  },
);

export default Logo;
