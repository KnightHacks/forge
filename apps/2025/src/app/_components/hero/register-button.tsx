import Link from "next/link";
import { env } from "~/env";

interface RegisterButtonProps {
  className?: string;
}

export default function RegisterButton({ className }: RegisterButtonProps) {
  return (
    <div className={`group relative ${className || ""}`}>
      {/* Main button with TextBox styling */}
      <div className="relative rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-all duration-300 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:bg-[#d83434]">
        <Link
          href={`${env.BLADE_URL}hacker/application/knighthacks-viii`}
          target="_blank"
          rel="noopener noreferrer"
          className="tk-ccmeanwhile relative z-10 inline-block px-8 py-4 text-lg font-bold whitespace-nowrap text-slate-800 transition-colors duration-300 group-hover:text-white sm:px-10 sm:py-5 sm:text-xl md:px-12 md:py-6 md:text-2xl lg:text-3xl xl:text-4xl"
        >
          Register to hack
        </Link>
      </div>

      {/* Black drop shadow */}
      <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-300 group-hover:translate-x-4 group-hover:translate-y-4" />
    </div>
  );
}
