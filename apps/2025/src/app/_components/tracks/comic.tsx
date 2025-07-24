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
    />
  );
});

export default Comic;
