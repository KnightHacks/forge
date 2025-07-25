import Link from "next/link";

interface RegisterButtonProps {
  className?: string;
  url?: string;
}

export default function RegisterButton({ className, url = "https://blade.knighthacks.org/hacker/application/knighthacks-viii" }: RegisterButtonProps) {
  return (
    <div className={`group relative ${className || ""}`}>
      <div className="relative z-0 flex max-w-max items-center overflow-hidden rounded-none p-[3px] md:p-[6px] group-hover:p-0 transition-all duration-300">
        <div className="moving-border absolute inset-0 h-full w-full rounded-none bg-[conic-gradient(from_0deg,#f44336_0deg,#ff9800_60deg,#ffeb3b_90deg,#2196f3_150deg,#f44336_210deg,transparent_250deg)] group-hover:opacity-0 transition-opacity duration-300" />
        
        <div className="relative z-10 flex items-center">
          <div className="relative rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-all duration-300 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:bg-[#F7F0C6] md:bg-[#F7F0C6] md:group-hover:bg-[#d83434]">
            <Link
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="tk-ccmeanwhile relative z-10 inline-block px-8 py-4 text-lg font-bold whitespace-nowrap text-slate-800 transition-colors duration-300 group-hover:text-slate-800 sm:px-10 sm:py-5 sm:text-xl md:px-12 md:py-6 md:text-2xl md:text-slate-800 md:group-hover:text-white lg:text-3xl xl:text-4xl"
            >
              Register to hack
            </Link>
          </div>
        </div>
      </div>
      
    </div>
  );
}
