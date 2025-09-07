"use client";

import Image from "next/image";
import { useEffect } from "react";

export default function MehdiChraibiPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".scroll-section").forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <main className="relative flex flex-col items-center min-h-screen w-full text-gray-900 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 bg-[url('/wallpaper.png')] bg-cover bg-center -z-10"></div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 -z-5"></div>

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Profile & Intro Section */}
        <section className="scroll-section flex flex-col items-center opacity-0 transform translate-y-12 transition-all duration-700 ease-out py-32">
          <Image
            src="/IMG_1699-photoaidcom-cropped.png"
            alt="Mehdi Chraibi"
            width={120}
            height={120}
            className="rounded-full mb-6"
          />

          <h1 className="text-4xl font-bold mb-4 text-white text-center">
            Hey, I'm <span style={{ color: "#ef7a71" }}>Mehdi Chraibi</span>!
          </h1>

          <p className="text-lg text-gray-200 mb-4 text-center">
            I'm a 3rd year <span style={{ color: "#bf9b30" }}>UCF</span> student interested in software development.
          </p>

          <p className="text-lg text-gray-200 mb-8 text-center">
            Fun fact: I{" "}
            <a
              href="https://devpost.com/software/ai-oxndzh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              participated
            </a>{" "}
            in KnightHacks VII!
          </p>

          <div className="flex gap-4 justify-center">
            <a
              href="https://github.com/mchdics"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 rounded-2xl bg-gray-900 text-white hover:bg-gray-700 transition"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/mehdi-chraibi-fl/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 rounded-2xl bg-blue-600 text-white hover:bg-blue-300 transition"
            >
              LinkedIn
            </a>
            <a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 rounded-2xl bg-green-600 text-white hover:bg-green-400 transition"
            >
              Resume
            </a>
          </div>
        </section>

        {/* Placeholder Scroll Section with Quote */}
        <section className="scroll-section opacity-0 transform translate-y-12 transition-all duration-700 ease-out py-32 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">More about me</h2>
          <p className="text-lg text-gray-200 mb-4">
            I'm a transfer from Valencia, so everything is a bit new to me.
            My hobbies include reading, working out, and collecting quotes. Here's one:
          </p>

          <blockquote className="text-xl text-gray-200 italic border-l-4 border-yellow-500 pl-6 text-left mx-auto max-w-xl whitespace-pre-line">
            {"\"Never regret thy fall,\nO Icarus of the fearless flight\nFor the greatest tragedy of them all\nIs never to feel the burning light.\""}
          </blockquote>
        </section>
      </div>
    </main>
  );
}
