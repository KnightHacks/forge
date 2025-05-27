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
    <div className="flex w-full justify-center mt-6 sm:mt-8 md:mt-10 max-w-[40%] sm:max-w-[40%] md:max-w-[28%] lg:max-w-[28%]">
      <Link 
        href={`${env.BLADE_URL}/hacker/application`} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`${bn.className} ${className} block w-full`}
      >
        <div className="bg-[#D63434] text-white text-3xl sm:text-3xl md:text-4xl lg:text-5xl rounded-xl sm:rounded-2xl max-h-16 sm:max-h-20 md:max-h-16 lg:max-h-25 flex items-center justify-center whitespace-nowrap py-10 px-6 sm:px-10 md:px-16 lg:px-20 hover:bg-[#b82b2b] transition-colors transition-transform hover:scale-105">
          Register to hack
        </div>
      </Link>
    </div>
  );
}
