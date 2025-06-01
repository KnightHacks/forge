import Link from 'next/link';
import { Bebas_Neue } from "next/font/google"; 
import { env } from "~/env";
import React from "react";

const bn = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

interface RegisterButtonProps {
  className?: string;
}

export default function RegisterButton({ className }: RegisterButtonProps) {
  return (
    <Link 
      href={`${env.BLADE_URL}/hacker/application`} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`${bn.className} ${className} inline-block bg-[#D63434] text-white text-2xl sm:text-3xl md:text-4xl rounded-xl sm:rounded-2xl py-3 px-6 sm:py-4 sm:px-8 hover:bg-[#b82b2b] transition-all duration-300 hover:scale-105 transform whitespace-nowrap`}
    >
      Register to hack
    </Link>
  );
}
