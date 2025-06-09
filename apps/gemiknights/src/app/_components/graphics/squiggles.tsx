import Image from "next/image";

const Squiggles = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-[-1]">
      {/* Top Left */}
      <div className="translate-y-3/5 absolute left-0 top-0 -translate-x-1/4 opacity-50">
        <Image
          src="/Asset 4.svg"
          alt="Decorative squiggle"
          width={200}
          height={200}
          className="h-full w-full object-contain"
        />
      </div>

      {/* Top Right */}
      <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-50">
        <Image
          src="/Asset 5.svg"
          alt="Decorative squiggle"
          width={200}
          height={200}
          className="h-full w-full object-contain"
        />
      </div>

      {/* Bottom Left */}
      <div className="absolute bottom-0 left-0 translate-x-1/4 translate-y-1/4 opacity-50">
        <Image
          src="/Asset 6.svg"
          alt="Decorative squiggle"
          width={200}
          height={200}
          className="h-full w-full object-contain"
        />
      </div>

      {/* Bottom Right */}
      <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 opacity-50">
        <Image
          src="/Asset 8.svg"
          alt="Decorative squiggle"
          width={300}
          height={300}
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
};

export default Squiggles;
