"use client";

import { useEffect, useState } from "react";
import Image from "next/image"; // ✅ Import Next.js Image

export default function EmanuelVargasPage() {
  const [text, setText] = useState("");
  const tagline = "Developer • UCF Junior • KnightHacks Dev Team Applicant";

  // Typewriter effect for tagline
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(tagline.slice(0, i));
      i++;
      if (i > tagline.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black text-yellow-400 p-8">
      <div className="bg-black/90 border border-yellow-500 rounded-2xl shadow-2xl p-10 max-w-4xl w-full text-center space-y-12">
        
        {/* KnightHacks Banner */}
        <Image
          src="/kh-neon-banner.png"
          alt="KnightHacks Banner"
          width={1000}   // adjust width as needed
          height={300}   // adjust height as needed
          className="w-full rounded-lg shadow-md animate-fadeIn"
        />

        {/* Header */}
        <div className="animate-fadeIn">
          <h1 className="text-5xl font-bold mb-4 text-yellow-400">
            Emanuel Vargas
          </h1>
          <p className="text-lg text-gray-300">{text}</p>
        </div>

        {/* Resume */}
        <div className="animate-fadeIn">
          <a
            href="/Resume-3.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg hover:bg-yellow-400 hover:scale-105 transition transform shadow-md"
          >
            View Resume
          </a>
        </div>

        {/* My Links */}
        <div className="flex justify-center gap-10 animate-fadeIn">
          <a
            href="https://github.com/manny0624"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 font-medium underline transition"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/feed/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 font-medium underline transition"
          >
            LinkedIn
          </a>
        </div>

        {/* My Stats */}
        <div className="grid grid-cols-3 gap-6 text-center animate-fadeIn">
          <div className="bg-gray-900 border border-yellow-500 rounded-lg p-4">
            <h3 className="text-xl font-bold text-yellow-400">2022–2024</h3>
            <p className="text-sm text-gray-400">FAU (Freshman–Sophomore)</p>
          </div>
          <div className="bg-gray-900 border border-yellow-500 rounded-lg p-4">
            <h3 className="text-xl font-bold text-yellow-400">2025–2027</h3>
            <p className="text-sm text-gray-400">UCF (Junior → Graduation)</p>
          </div>
          <div className="bg-gray-900 border border-yellow-500 rounded-lg p-4">
            <h3 className="text-xl font-bold text-yellow-400">Now</h3>
            <p className="text-sm text-gray-400">UCF Junior • KnightHacks Member</p>
          </div>
        </div>

        {/* My Timeline */}
        <div className="text-left animate-fadeIn">
          <h2 className="text-2xl font-bold text-yellow-300 mb-6">Journey</h2>
          <ul className="space-y-6 border-l-2 border-yellow-500 pl-4">
            <li>
              <h3 className="text-yellow-400 font-semibold">2025–2027 — UCF</h3>
              <p className="text-gray-400 text-sm">
                Transferred to UCF as a junior. Active KnightHacks club member, 
                now applying for the KnightHacks Development Team to contribute 
                to impactful projects while pursuing my degree.
              </p>
            </li>
            <li>
              <h3 className="text-yellow-400 font-semibold">2022–2024 — FAU</h3>
              <p className="text-gray-400 text-sm">
                Completed my freshman and sophomore years at FAU, building a 
                foundation in computer science, problem-solving, and collaborative learning.
              </p>
            </li>
          </ul>
        </div>

        {/* My Skills */}
        <div className="text-left animate-fadeIn">
          <h2 className="text-2xl font-bold text-yellow-300 mb-6">Skills & Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="bg-gray-900 border border-yellow-500 rounded-lg p-4 text-center hover:bg-gray-800 transition">
              <p className="text-yellow-400 font-semibold">React</p>
            </div>
            <div className="bg-gray-900 border border-yellow-500 rounded-lg p-4 text-center hover:bg-gray-800 transition">
              <p className="text-yellow-400 font-semibold">Node.js</p>
            </div>
            <div className="bg-gray-900 border border-yellow-500 rounded-lg p-4 text-center hover:bg-gray-800 transition">
              <p className="text-yellow-400 font-semibold">Python</p>
            </div>
            <div className="bg-gray-900 border border-yellow-500 rounded-lg p-4 text-center hover:bg-gray-800 transition">
              <p className="text-yellow-400 font-semibold">Git</p>
            </div>
          </div>
        </div>

        {/* My Contact Info */}
        <p className="mt-8 text-lg font-bold text-yellow-400 animate-pulse">
          💻 All contact information can be found in my resume 💻
        </p>
      </div>
    </main>
  );
}
