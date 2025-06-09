import Image from "next/image";

const Logo = () => {
  return (
    <div className="flex items-center justify-center w-full px-4 sm:px-6 md:px-8 lg:px-10">
      <Image
        src="/gemiknightslogonoglow.svg"
        alt="Knight Hacks 2025 Logo"
        width={500}
        height={500}
        draggable="false"
        className="w-[250px] h-auto sm:w-[300px] md:w-[400px] lg:w-[500px]"
      />
    </div>
  );
}
export default Logo;