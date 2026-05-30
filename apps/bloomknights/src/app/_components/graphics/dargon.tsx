import Image from "next/image";
import Link from "next/link";

const Dargon = () => {
  return (
    <Link href="#">
      <Image
        src="/BloomKnightsSigil.svg"
        alt="Knight Hacks BloomKnights Logo"
        width={100}
        height={100}
        draggable={false}
        className=""
      />
    </Link>
  );
};
export default Dargon;
