import Image from "next/image";
import Link from "next/link";
import { Bebas_Neue } from "next/font/google"; 

const footerSVG = "./khFull.svg";
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
    <div className="flex flex-col items-center space-y-6 mx-auto mt-10">
        <div className="flex w-1/3 justify-center">
            <Image src={footerSVG} alt="Knight Hacks" width={2267} height={803} />
        </div>
        <div className={`${bn.className} flex flex-col w-full justify-center bg-black text-white py-15`}>
            <div className="text-center mb-3 text-xl sm:text-2xl md:text-3xl lg:text-4xl">
                <Link href={mlhcoc}>MLH code of conduct </Link>
                 | 
                <Link href={sponsor}> sponsor us </Link>
                 | 
                <Link href={contact}> contact us </Link>
                 | 
                <Link href={hackersGuide}> hackers guide</Link>
            </div>
            <span className="text-center text-base sm:text-lg md:text-xl lg:text-2xl">
                Copyright © 2019 - 2025 knighthacks. All Rights Reserved.
            </span>
        </div>
    </div>
  );
}
