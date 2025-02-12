import Image from "next/image";

import LinkedInSVG from "./officer-card-assets/linkedin-icon";
import MajorSVG from "./officer-card-assets/major";

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
    <>
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
            <h1 className="mt-16 font-['Pragati_Narrow'] text-2xl font-bold tracking-[0.05em] text-white sm:mb-3 sm:text-[35px]">
              {name}
            </h1>
            <Image
              src={image}
              alt={name}
              width={450}
              height={475}
              className="z-20 w-[475px] object-cover p-2 md:w-[475px]"
            />
            <div className="mx-5 flex items-center space-x-4 md:justify-center">
              <a href={linkedin}>
                <LinkedInSVG className="h-8 w-8" />
              </a>
              <h1 className="font-poppins text-center text-xl font-semibold leading-[57px] tracking-wider text-white">
                {position}
              </h1>
              <div className="absolute -right-5 md:-bottom-36 md:-right-28">
                <MajorSVG major={major} className="h-48 w-48 md:h-64 md:w-64" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
