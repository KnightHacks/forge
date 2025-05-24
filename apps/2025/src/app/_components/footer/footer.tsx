import Image from "next/image";
import Link from "next/link";
import { Bebas_Neue } from "next/font/google"; 

const footerSVG = "./khFull.svg";
const shadow = "./shadow.svg";
const mlhcoc = "https://mlh.io/code-of-conduct";
const sponsor = "https://blade.knighthacks.org/sponsor";
const contact = "mailto:hack@knighthacks.org";
const hackersGuide = "https://knighthacks.org/hackers-guide";
const bn = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export default function Footer() {
  return (
    <div className="flex flex-col items-center mx-auto">
        <div className="relative w-full">
            <Image src={shadow} alt="Shadow" width={2000} height={2000} className="w-full opacity-75" />
            <Image src={footerSVG} alt="Knight Hacks" width={2267} height={803} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 mb-20" />
        </div>
        <div className={`${bn.className} flex flex-col w-full justify-center bg-black text-white py-15 -mt-10`}>
            <div className="flex justify-center text-center mb-3 px-2 text-lg sm:text-xl md:text-3xl lg:text-4xl">
                <Link href={mlhcoc} className="flex transform transition px-3 hover:scale-105 hover:underline">MLH code of conduct </Link>
                 | 
                <Link href={sponsor} className="flex transform transition px-3 hover:scale-105 hover:underline"> sponsor us </Link>
                 | 
                <Link href={contact} className="flex transform transition px-3 hover:scale-105 hover:underline"> contact us </Link>
                 | 
                <Link href={hackersGuide} className="flex transform transition px-3 hover:scale-105 hover:underline"> hackers guide</Link>
            </div>
            <span className="text-center text-base sm:text-lg md:text-xl lg:text-2xl">
                Copyright © 2019 - 2025 knighthacks. All Rights Reserved.
            </span>
        </div>
    </div>
  );
}
