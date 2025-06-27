import { Bebas_Neue } from "next/font/google";
import Link from "next/link";
import { env } from "~/env";

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
      href={`${env.BLADE_URL}hacker/application/knighthacks-viii`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${bn.className} ${className} inline-block transform rounded-xl bg-[#D63434] px-6 py-3 text-2xl whitespace-nowrap text-white transition-all duration-300 hover:scale-105 hover:bg-[#b82b2b] sm:rounded-2xl sm:px-8 sm:py-4 sm:text-3xl md:text-4xl`}
    >
      Register to hack
    </Link>
  );
}
