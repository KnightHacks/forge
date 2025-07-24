import Image from "next/image";

export default function SidewalkBackground() {
  return (
    <div className="relative h-[150px] w-full sm:h-[200px] md:h-[300px] lg:h-[350px] xl:h-[400px]">
      <Image
        src="/sidewalk.svg"
        alt="Sidewalk"
        fill
        className="object-cover"
        sizes="100vw"
      />
    </div>
  );
}
