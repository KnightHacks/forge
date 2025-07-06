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
      {/* Backdrop blur and glass effect */}
      <div className="absolute inset-0 rounded-lg sm:rounded-xl md:rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl" />
      
      {/* Gradient overlay - more red */}
      <div className="absolute inset-0 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-r from-red-500/30 via-red-600/30 to-red-700/30" />
      
      {/* Subtle glow effect - more red */}
      <div className="absolute inset-0 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-r from-red-500/20 via-red-600/20 to-red-700/20 blur-xl" />
      
      <Link
        href={`${env.BLADE_URL}hacker/application/knighthacks-viii`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${bn.className} ${className} relative z-10 inline-block transform rounded-lg sm:rounded-xl md:rounded-2xl px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl whitespace-nowrap text-white transition-all duration-300 hover:scale-105 hover:bg-white/10`}
      >
        Register to hack
      </Link>
    </div>
  );
}
