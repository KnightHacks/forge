"use client";

import Link from "next/link";

import CoolButton from "./assets/coolbutton";
import NeonTkSVG from "./assets/neon-tk";
import SwordSVG from "./assets/sword";
import HeroSVG from "./hero-assets/hero-icon";
import TypingText from "./hero-assets/typing-text";

const Hero = ({ bladeUrl }: { bladeUrl: string }) => {
  return (
    <section className="relative min-h-screen overflow-hidden px-4 py-12">
      <SwordSVG className="animate-float absolute left-[-40px] top-8 block hidden w-[300px] text-purple-400 opacity-50 md:block" />
      <NeonTkSVG className="animate-float absolute bottom-20 right-20 hidden w-[300px] text-purple-500 opacity-50 md:block" />

      <div className="z-50 mx-auto max-w-6xl">
        <div className="grid min-h-[calc(100vh-6rem)] items-center gap-8 lg:grid-cols-2">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <h1 className="font-pragati mb-6 text-2xl font-bold leading-tight tracking-tight text-white [text-shadow:0px_0px_40px_#6B21A8,0px_0px_20px_#6B21A8,0px_0px_10px_#6B21A8] md:text-5xl lg:text-6xl">
              Bridging the gap between the classroom and the tech industry
            </h1>
            <TypingText
              text="Empowering students with real-world skills and industry connections"
              className="mb-8 text-xl text-gray-300 md:text-xl"
              repeat={false}
            />
            <div className="mt-8 flex justify-center md:justify-start">
              <div className="relative z-0 flex max-w-max items-center overflow-hidden rounded-lg p-[3px]">
                <div className="moving-border absolute inset-0 h-full w-full rounded-lg bg-[conic-gradient(from_0deg,#9722b6_20deg,#8b5cf6_140deg,transparent_240deg)]" />
                <div className="relative z-10">
                  <Link href={bladeUrl}>
                    <CoolButton label="Get Started" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative">
              <HeroSVG className="relative mx-auto h-full w-full max-w-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
