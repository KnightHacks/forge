"use client";

import React from "react";

import HeroSVG from "./hero-assets/hero-icon";

const Hero = () => {
  return (
    <section className="relative min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid min-h-[calc(100vh-6rem)] items-center gap-8 lg:grid-cols-2">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <h1 className="font-pragati mb-6 text-4xl font-bold leading-tight tracking-tight text-white [text-shadow:0px_0px_40px_#6B21A8,0px_0px_20px_#6B21A8,0px_0px_10px_#6B21A8] md:text-5xl lg:text-6xl">
              Bridging the gap between the classroom and the tech industry
            </h1>
            <p className="mb-8 text-lg text-gray-300 md:text-xl">
              Empowering students with real-world skills and industry
              connections
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-purple-600/20 to-purple-800/20 blur-3xl"></div>
              <HeroSVG className="relative mx-auto h-full w-full max-w-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
