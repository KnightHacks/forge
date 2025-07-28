import Link from "next/link";

interface RegisterButtonProps {
  className?: string;
  url?: string;
}

export default function RegisterButton({ className, url = "https://blade.knighthacks.org/hacker/application/knighthacks-viii" }: RegisterButtonProps) {
  return (
    <div className={`group relative ${className || ""}`}>
      <div className="relative z-0 flex max-w-max items-center overflow-hidden rounded-none p-[3px] md:p-[6px] group-hover:p-0 transition-all duration-300">
      
      <div className="relative z-10 flex items-center">
          <div className="relative rounded-none bg-[#C04B3D] outline-2 -outline-offset-3 outline-black transition-all duration-300 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:bg-[#F7F0C6]">
            <Link
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="tk-ccmeanwhile relative z-10 inline-block px-8 py-4 text-lg font-bold whitespace-nowrap text-white transition-colors duration-300 group-hover:text-slate-800 sm:px-10 sm:py-5 sm:text-xl md:px-12 md:py-6 md:text-2xl lg:text-3xl xl:text-4xl focus:outline-4 focus:outline-offset-2 focus:outline-[#d83434] rounded-none"
            >
              Register to hack
            </Link>
          </div>
        </div>
      </div>
      
    </div>
  );
}
