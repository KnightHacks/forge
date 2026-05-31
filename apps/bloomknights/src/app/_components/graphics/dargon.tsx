import Image from "next/image";
import Link from "next/link";

const Dargon = () => {
  return (
    <Link href="/" aria-label="BloomKnights home">
      <Image
        src="/BloomKnightsSigil.svg"
        alt="BloomKnights sigil"
        width={100}
        height={100}
        draggable={false}
        className=""
      />
    </Link>
  );
};
export default Dargon;
