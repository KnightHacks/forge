import Image from "next/image";
import Link from "next/link";

const Dargon = () => {
    return (
        <Link href="#">
            <Image
                src="/dargon.svg"
                alt="Knight Hacks Gemiknights Logo"
                width={100}
                height={100}
                draggable={false}
                className="brightness-0 invert z-10"
            />
        </Link>
    );
};
export default Dargon;