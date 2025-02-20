"use client";

import NeonTkSVG from "./assets/neon-tk";
import SwordSVG from "./assets/sword";

export default function About() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#1a0b2e] to-[#1a0b2e]">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 opacity-50 blur-3xl"></div>

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        <h1 className="font-pragati mb-6 text-2xl font-bold leading-tight tracking-tight text-white [text-shadow:0px_0px_40px_#6B21A8,0px_0px_20px_#6B21A8,0px_0px_10px_#6B21A8] md:text-5xl lg:text-6xl">
          ABOUT US
        </h1>

        <div className="relative">
          <p className="font-poppins px-4 text-lg font-semibold leading-relaxed tracking-wide text-white/80 md:px-12 md:text-2xl">
            Knight Hacks is the largest Software Development and only Hackathon
            organization at the University of Central Florida. Our mission is to
            serve the technologist community of Florida by running various
            workshops to sharpen technical skills, socials to help foster a
            passionate community, and projects/mentorship programs to help
            refine professional skills. Every October, we run our annual
            Hackathon, welcoming hundreds of passionate students from all
            throughout the nation to UCF for a weekend full of programming!
            Passion is contagious, and Knight Hacks is a super spreader.
          </p>
        </div>
      </div>

      <SwordSVG className="absolute -bottom-20 -right-1 hidden h-auto w-full max-w-[400px] transform text-purple-400 opacity-50 md:block" />
      <NeonTkSVG className="absolute left-10 top-16 hidden h-[200px] w-full max-w-[400px] transform text-purple-400 opacity-50 md:block" />
    </div>
  );
}
