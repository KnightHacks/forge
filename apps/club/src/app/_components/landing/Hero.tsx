"use client";

import React from "react";

import HeroSVG from "./hero-assets/hero-icon";
import TypingText from "./hero-assets/typing-text";

const Hero = ({ bladeUrl }: { bladeUrl: string }) => {
  return (
    <section className="relative min-h-screen bg-gradient-to-b from-purple-900 to-[#0F172A] px-4 py-12">
      <div className="mx-auto max-w-6xl">
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
            <button
              onClick={() =>
                window.open(bladeUrl, "_blank", "noopener,noreferrer")
              }
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-purple-600 to-purple-950 px-6 py-3 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 transition-opacity duration-300 group-hover:opacity-20"></span>
              <span className="relative z-10 flex items-center gap-2 font-semibold">
                Get Started
              </span>
            </button>
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
