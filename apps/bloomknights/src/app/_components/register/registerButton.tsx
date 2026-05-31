import Link from "next/link";

import BloomButtonEdge from "../ui/BloomButtonEdge";

const Register = () => {
  return (
    <div className="font-dm-sans mt-20 flex flex-col items-center justify-center font-bold">
      <div className="bloom-cta-shell">
        <div className="bloom-cta-frame">
          <div
            className="moving-border absolute inset-0 h-full w-full rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, #c4a882 0deg, #a8c490 90deg, #b8d4e8 180deg, #c9b8d8 270deg, #c4a882 360deg)",
            }}
          />
          <div className="relative z-10 flex w-full items-center">
            <Link
              href="https://blade.knighthacks.org/hacker/application/bloomknights"
              target="_blank"
              rel="noopener noreferrer"
              className="wc-btn bloom-cta-button group"
            >
              <span className="bloom-cta-label transition-all duration-500 group-hover:text-white">
                Register Now!
              </span>
              <span className="bloom-cta-mark" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <BloomButtonEdge />
      </div>
    </div>
  );
};

export default Register;
