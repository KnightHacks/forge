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
    <div className="relative">
      <div className="absolute inset-0 rounded-lg border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md sm:rounded-xl md:rounded-2xl" />

      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-500/30 via-red-600/30 to-red-700/30 sm:rounded-xl md:rounded-2xl" />

      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-500/20 via-red-600/20 to-red-700/20 blur-xl sm:rounded-xl md:rounded-2xl" />

      <Link
        href={`${env.BLADE_URL}hacker/application/knighthacks-viii`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${bn.className} ${className} relative z-10 inline-block transform rounded-lg px-6 py-3 text-xl whitespace-nowrap text-white transition-all duration-300 hover:scale-105 hover:bg-white/10 sm:rounded-xl sm:px-8 sm:py-4 sm:text-2xl md:rounded-2xl md:px-10 md:py-5 md:text-3xl lg:text-4xl xl:text-5xl`}
      >
        Register to hack
      </Link>
    </div>
  );
}
