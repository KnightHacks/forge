import Link from "next/link";

const Register = () => {
  return (
    <div className="font-nunito mt-20 flex flex-col items-center justify-center font-bold text-white">
      <div className="relative z-0 flex max-w-max items-center overflow-hidden rounded-full p-[3px]">
        <div
          className="moving-border absolute inset-0 h-full w-full rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #fcbc4e 0deg, #fe73fe 120deg, #a8d471 240deg, #fcbc4e 360deg)",
          }}
        />
        <div className="relative z-10 flex items-center">
          <Link
            href="https://blade.knighthacks.org/hacker/application/bloomknights"
            target="_blank"
            rel="noopener noreferrer"
            className="font-fredoka group relative flex w-[260px] items-center justify-center rounded-full bg-white px-8 py-3 text-lg font-semibold uppercase tracking-wide text-[#fe73fe] transition-all duration-500 ease-in-out hover:scale-105 hover:bg-gradient-to-r hover:from-[#fcbc4e] hover:via-[#fe73fe] hover:to-[#a8d471] hover:text-white md:w-[420px] md:text-2xl"
          >
            <span className="w-full text-center transition-all duration-500 group-hover:text-white">
              Register Now! 🌸
            </span>
            <span className="absolute right-6 text-[#fe73fe] transition-all duration-500 group-hover:text-white">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
