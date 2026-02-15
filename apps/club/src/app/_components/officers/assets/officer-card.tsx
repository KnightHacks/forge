import Image from "next/image";

import LinkedInSVG from "./officer-card-assets/linkedin-icon";
import MajorSVG from "./officer-card-assets/major";
import RoundMajorSVG from "./officer-card-assets/round-major";

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
    <div className="flex w-full max-w-[400px] flex-col items-center space-y-4 sm:max-w-[600px] md:mb-8">
      <div className="relative h-[300px] w-[250px] sm:h-[500px] sm:w-[400px]">
        <Image
          src={"/container.svg"}
          alt="container"
          fill
          style={{ objectFit: "cover" }}
        />
        <div className="relative z-10 flex flex-col items-center text-center">
          <h1 className="font-poppins mt-8 text-xl font-semibold tracking-[0.05em] text-white sm:mb-3 sm:mt-16 sm:text-[35px]">
            {name}
          </h1>
          <div className="flex justify-center">
            <Image
              src={image}
              alt={name}
              width={0}
              height={0}
              className="z-20 h-[150px] w-[150px] object-cover p-2 sm:h-[279px] sm:w-[250px]"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div className="mx-5 flex items-center space-x-2 pt-3 sm:flex-row sm:justify-center sm:space-x-4 sm:space-y-0">
            <a href={linkedin}>
              <LinkedInSVG className="h-8 w-8" />
            </a>
            <h1 className="font-poppins z-10 text-center text-lg font-semibold tracking-wider text-white sm:text-xl">
              {position}
            </h1>
            {major.endsWith("Engineering") ? (
              <div className="absolute -right-5 top-[95%] md:-right-20 md:top-[88%]">
                <RoundMajorSVG
                  major={major}
                  className="h-24 w-24 md:h-48 md:w-48"
                />
              </div>
            ) : (
              <div className="absolute -right-14 top-[80%] md:-bottom-24 md:-right-28">
                <MajorSVG
                  major={major}
                  className="h-36 w-36 md:h-48 md:w-48 lg:h-64 lg:w-64"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
