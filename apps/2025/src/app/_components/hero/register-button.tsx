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
    <div className="flex w-full justify-center mt-10">
      <Link 
        href={`${env.BLADE_URL}/hacker/application`} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`${bn.className} ${className} block`}
      >
        <div className="bg-[#D63434] text-white text-6xl rounded-2xl py-10 px-20 hover:bg-[#b82b2b] transition-colors transition-transform hover:scale-105">
          Register to hack
        </div>
      </Link>
    </div>
  );
}
