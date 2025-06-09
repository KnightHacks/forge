import Image from "next/image";

const Logo = () => {
  return (
    <div className="flex items-center justify-center w-full mx-10">
      <Image
        src="/gemiknightslogonoglow.svg"
        alt="Knight Hacks 2025 Logo"
        width={500}
        height={500}
        draggable="false"
      />
    </div>
  );
}
export default Logo;