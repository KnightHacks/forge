import Image from "next/image";

import Container from "./container";

interface OfficerCardProps {
  image: string;
  name: string;
  linkedin: string;
  major: string;
  position: string;
}

export default function OfficerCard({
  image,
  name,
  linkedin,
  major,
  position,
}: OfficerCardProps) {
  return (
    <div className="flex w-full max-w-[600px] flex-col items-center space-y-4 sm:h-[600px]">
      <div className="relative h-[500px] w-[400px]">
        <Image
          src={"/container.svg"}
          alt="container"
          fill
          style={{
            objectFit: "cover",
          }}
        />
        <div className="relative z-10 flex-col justify-center text-center">
          <h1 className="mt-16 font-['Pragati_Narrow'] text-2xl font-bold tracking-[0.05em] text-white sm:mb-8 sm:text-[35px]">
            {name}
          </h1>
          <Image
            src={image}
            alt={name}
            width={475}
            height={475}
            className="z-20 w-6/12 object-cover sm:w-[475px] md:w-[475px]"
          />
        </div>
        <div className="relative">
          <Image
            src={"/major-container.svg"}
            alt="major-container"
            fill
            style={{
              objectFit: "cover",
            }}
          />
          <h1>{major}</h1>
        </div>
      </div>
    </div>
  );
}
