import Link from "next/link";

const Register = () => {
  return (
    <div className="font-dm-sans mt-20 flex flex-col items-center justify-center font-bold">
      <div className="relative z-0 flex max-w-max items-center overflow-hidden rounded-full p-[3px]">
        <div
          className="moving-border absolute inset-0 h-full w-full rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #c4a882 0deg, #a8c490 90deg, #b8d4e8 180deg, #c9b8d8 270deg, #c4a882 360deg)",
          }}
        />
        <div className="relative z-10 flex items-center">
          <Link
            href="https://blade.knighthacks.org/hacker/application/bloomknights"
            target="_blank"
            rel="noopener noreferrer"
            className="wc-btn group relative flex w-[260px] items-center justify-center px-8 py-3 text-lg md:w-[420px] md:text-2xl"
          >
            <span className="w-full text-center transition-all duration-500 group-hover:text-[#2a1a06]">
              Register Now! 🌸
            </span>
            <span className="absolute right-6 transition-all duration-500">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
