import Image from "next/image";

interface NavLink {
  href: string;
  label: string;
}

interface NavContentProps {
  navLinks: NavLink[];
}

function NavContent({ navLinks }: NavContentProps) {
  return (
    <div className="group relative">
      {/* Main navbar container with TextBox styling */}
      <div className="relative rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1">
        <div className="flex h-16 items-center justify-between px-4 sm:h-18 sm:px-6 md:h-20 md:px-8 lg:px-12 xl:px-16 2xl:px-32">
          <div className="flex items-center">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-none bg-white outline-1 -outline-offset-1 outline-black sm:h-11 sm:w-11 md:h-12 md:w-12">
              <Image
                src="/KH2025Small.svg"
                alt="Knight Hacks 2025 Logo"
                width={48}
                height={48}
                className="h-8 w-8 object-contain sm:h-9 sm:w-9 md:h-10 md:w-10"
              />
            </div>
          </div>
          <div className="hidden items-center gap-4 sm:gap-6 md:gap-8 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="tk-ccmeanwhile relative rounded-none px-3 py-2 text-sm font-medium text-slate-800 outline-1 -outline-offset-1 outline-black transition-colors duration-200 hover:bg-slate-100 hover:text-[#1570AD] sm:text-base md:text-lg"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="w-[80px] sm:w-[90px] md:w-[110px]" />
        </div>
      </div>

      {/* Black drop shadow */}
      <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
    </div>
  );
}

export default NavContent;
