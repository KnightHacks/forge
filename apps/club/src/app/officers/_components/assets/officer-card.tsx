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
              className="z-20 w-6/12 object-cover sm:w-[475px] md:w-[475px]"
            />
            <div className="flex items-center justify-center space-x-2">
              <a href={linkedin}>
                <LinkedInSVG className="h-8 w-8" />
              </a>
              <h1 className="font-poppins text-center text-xl font-semibold leading-[57px] tracking-wider text-white">
                {position}
              </h1>
            </div>
          </div>
        </div>
      </div>
      <MajorSVG major={major} />
    </>
  );
}
