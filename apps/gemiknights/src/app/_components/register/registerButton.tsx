import Link from "next/link";

const Register = () => {
  return (
    <div className="tk-peridot-devanagari mt-20 flex flex-col items-center justify-center font-semibold text-white">
      <div className="relative z-0 flex max-w-max items-center overflow-hidden rounded-full p-[3px]">
        <div className="moving-border absolute inset-0 h-full w-full rounded-full bg-[conic-gradient(from_0deg,#ec38bc_20deg,#f8c255_140deg,transparent_240deg)]" />
        <div className="relative z-10 flex items-center">
          <Link
            href={`https://blade.knighthacks.org/hacker/application/gemiknights`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex w-[300px] items-center justify-center rounded-full bg-white px-8 py-3 text-xl font-semibold text-[#ec38bc] transition-all duration-300 ease-in-out hover:bg-gradient-to-r hover:from-[#ec38bc] hover:via-[#f8c255] hover:to-[#ec38bc] hover:text-white md:w-[450px]"
          >
            <span className="w-full text-center transition-all duration-300 group-hover:text-white">
              Register Now!
            </span>
            <span className="absolute right-6 text-[#ec38bc] transition-all duration-300 group-hover:text-white">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
