"use client";
import Image from "next/image";
import NeonTkSVG from "~/app/_components/landing/assets/neon-tk";
import SwordSVG from "~/app/_components/landing/assets/sword";

import { MAV_IMG, FART_SOUND } from "@forge/consts/knight-hacks";
import { useState, useEffect } from "react";

export default function PersonalPage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const images = [
    { src: MAV_IMG.image, alt: "Image 1" },
    { src: MAV_IMG.image2, alt: "Image 2" },
    { src: MAV_IMG.image3, alt: "Image 3" },
    { src: MAV_IMG.image4, alt: "Image 4" }
    // Add your other image objects here
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-black via-black to-purple-950/40 px-4 py-12">

      <div className="relative mb-16 flex flex-col items-center">
        <h1 className="font-pragati mb-6 text-5xl font-bold tracking-tight text-white [text-shadow:0px_0px_40px_#6B21A8,0px_0px_20px_#6B21A8,0px_0px_10px_#6B21A8]">
          Maverick Reynolds
        </h1>
        
        <div className="relative h-[300px] w-[250px] sm:h-[400px] sm:w-[350px]">
          {images.map((image, index) => (
            <Image
              key={index}
              src={image.src}
              alt={image.alt}
              fill
              className={`rounded-lg object-cover transition-opacity duration-500 ${
                index === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
              style={{ objectFit: "cover" }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-center mb-8">
        <button
          onClick={() => new Audio(FART_SOUND).play()}
          className="transform rounded-lg bg-purple-900 px-6 py-3 text-lg font-bold text-white transition-all hover:scale-105 hover:bg-purple-800 active:scale-95"
        >
          💨 Make a Fart Sound
        </button>
      </div>


      <div className="mx-auto max-w-4xl">
        <h2 className="font-pragati mb-4 text-3xl font-bold text-purple-400">
          About Me
        </h2>
        <p className="mb-8 text-lg text-gray-300">
          I'm a Computational Mathematics student at UCF with a minor in Computer Science. I'm a huge nerd and love to learn new things. I've done some cool stuff with KH before but now I want to get a little more involved. Currently learning about no-code builders along with yes-code builders.
        </p>
        <p className="mb-8 text-lg text-gray-300">
          Also astronomy is fun I enjoy doing that, board games, and othe nerdy things. Ok the gym is actually coming into my routine also which is quite exciting woohoo.
        </p>
        <p className="mb-8 text-lg text-gray-300">
          I'm working on redoing my sites/portfolio right now so it might look a little messy but I'm working on it. Anyways thanks guys for taking a look haha
        </p>

        


        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: "🏆", title: "Hackathon Winner", desc: "ShellHacks 2024" },
            { icon: "📊", title: "300+ Users", desc: "UCF Crimes Project" },
            { icon: "🔭", title: "Astro Lover", desc: "I like Stars" },
            { icon: "🎥", title: "Maybe utuber?", desc: "One day..." },
          ].map((achievement) => (
            <div key={achievement.title} className="text-center p-4 bg-purple-900/20 rounded-lg hover:bg-purple-900/30 transition-colors">
              <div className="text-3xl mb-2">{achievement.icon}</div>
              <h4 className="text-purple-300 font-bold">{achievement.title}</h4>
              <p className="text-gray-400 text-sm">{achievement.desc}</p>
            </div>
          ))}
        </div>

        <div className="mb-8 flex justify-center space-x-6">
          <a
            href="https://www.linkedin.com/in/mavreyn/"
            target="_blank"
            rel="noopener noreferrer"
            className="transform transition-transform hover:scale-110"
          >
            <svg
              className="h-8 w-8 text-purple-400 hover:text-purple-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
          </a>

          <a
            href="https://github.com/mavreyn"
            target="_blank"
            rel="noopener noreferrer"
            className="transform transition-transform hover:scale-110"
          >
            <svg
              className="h-8 w-8 text-purple-400 hover:text-purple-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>

          <a
            href="https://instagram.com/@mavreyn"
            target="_blank"
            rel="noopener noreferrer"
            className="transform transition-transform hover:scale-110"
          >
            <svg
              className="h-8 w-8 text-purple-400 hover:text-purple-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </a>

          <a
            href="https://mavreyn.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="transform transition-transform hover:scale-110"
          >
            <svg
              className="h-8 w-8 text-purple-400 hover:text-purple-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm1 16.057v-3.057h2.994c-.059 1.143-.212 2.24-.456 3.279-.823-.12-1.674-.188-2.538-.222zm1.957 2.162c-.499 1.33-1.159 2.497-1.957 3.456v-3.62c.666.028 1.319.081 1.957.164zm-1.957-7.219v-3.015c.868-.034 1.721-.103 2.548-.224.238 1.027.389 2.111.446 3.239h-2.994zm0-5.014v-3.661c.806.969 1.471 2.15 1.971 3.496-.642.084-1.3.137-1.971.165zm2.703-3.267c1.237.496 2.354 1.228 3.29 2.146-.642.234-1.311.442-2.019.607-.344-.992-.775-1.91-1.271-2.753zm-7.241 13.56c-.244-1.039-.398-2.136-.456-3.279h2.994v3.057c-.865.034-1.714.102-2.538.222zm2.538 1.776v3.62c-.798-.959-1.458-2.126-1.957-3.456.638-.083 1.291-.136 1.957-.164zm-2.994-7.055c.057-1.128.207-2.212.446-3.239.827.121 1.68.19 2.548.224v3.015h-2.994zm1.024-5.179c.5-1.346 1.165-2.527 1.97-3.496v3.661c-.671-.028-1.329-.081-1.97-.165zm-2.005-.35c-.708-.165-1.377-.373-2.018-.607.937-.918 2.053-1.65 3.29-2.146-.496.844-.927 1.762-1.272 2.753zm-.549 1.918c-.264 1.151-.434 2.36-.492 3.611h-3.933c.165-1.658.739-3.197 1.617-4.518.88.361 1.816.67 2.808.907zm.009 9.262c-.988.236-1.92.542-2.797.9-.89-1.328-1.471-2.879-1.637-4.551h3.934c.058 1.265.231 2.488.5 3.651zm.553 1.917c.342.976.768 1.881 1.257 2.712-1.223-.49-2.326-1.211-3.256-2.115.636-.229 1.299-.435 1.999-.597zm9.924 0c.7.163 1.362.367 1.999.597-.931.903-2.034 1.625-3.257 2.116.489-.832.915-1.737 1.258-2.713zm.553-1.917c.27-1.163.442-2.386.501-3.651h3.934c-.167 1.672-.748 3.223-1.638 4.551-.877-.358-1.81-.664-2.797-.9zm.501-5.651c-.058-1.251-.229-2.46-.492-3.611.992-.237 1.929-.546 2.809-.907.877 1.321 1.451 2.86 1.616 4.518h-3.933z" />
            </svg>
          </a>
        </div>

        <div className="rounded-lg border-2 border-purple-500 p-8 [box-shadow:0px_0px_20px_#6B21A8] bg-black">
          <h2 className="font-pragati mb-6 text-3xl font-bold text-purple-400">
            Resume
          </h2>

          <div className="mb-8">
            <h3 className="font-pragati mb-4 text-2xl font-bold text-white">
              Experience
            </h3>
            <div className="mb-6">
              <div className="flex justify-between">
                <h4 className="text-xl font-bold text-purple-300">Software Engineering Intern - SpeerAI</h4>
                <span className="text-gray-400">May 2024 - August 2024</span>
              </div>
              <p className="text-gray-400">Orlando, FL</p>
              <ul className="mt-2 list-disc pl-5 text-gray-300">
                <li>Developed in-house space tracking software using Space-Track API, managing data synchronization with a custom-built database.</li>
                <li>Designed and implemented hybrid features of LangGraph and LangChain by creating custom classes, enabling hierarchical AI agents and RAG systems.</li>
                <li>Utilized technologies: React, Three.js, Tailwind, LangChain, LangGraph.</li>
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-pragati mb-4 text-2xl font-bold text-white">
              Projects
            </h3>
            
            <div className="mb-6">
              <div className="flex justify-between">
                <h4 className="text-xl font-bold text-purple-300">SmartCards - ShellHacks Hackathon</h4>
                <span className="text-gray-400">October 2024</span>
              </div>
              <ul className="mt-2 list-disc pl-5 text-gray-300">
                <li>Built a web application for receipt scanning and transaction classification using React, Tailwind, Flask, and OpenAI API.</li>
                <li>Outperformed 40 teams in a competition with over 700 participants.</li>
              </ul>
            </div>

            <div className="mb-6">
              <div className="flex justify-between">
                <h4 className="text-xl font-bold text-purple-300">UCF Crimes</h4>
                <span className="text-gray-400">January 2023 - March 2024</span>
              </div>
              <ul className="mt-2 list-disc pl-5 text-gray-300">
                <li>Created an incident notification system with PostgreSQL database (over 300 entries).</li>
                <li>Engaged over 300 Instagram followers and 200 Discord users with automated updates.</li>
                <li>Implemented natural language queries using PandasAI and OpenAI embeddings.</li>
              </ul>
            </div>

            <div className="mb-6">
              <div className="flex justify-between">
                <h4 className="text-xl font-bold text-purple-300">LegalFlow - Knight Hacks Hackathon VI</h4>
                <span className="text-gray-400">October 2023</span>
              </div>
              <ul className="mt-2 list-disc pl-5 text-gray-300">
                <li>Designed a document classification system using Azure AI and OpenAI's GPT.</li>
                <li>Earned honorary mention at the Morgan & Morgan Challenge.</li>
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-pragati mb-4 text-2xl font-bold text-white">
              Education
            </h3>
            <div className="mb-4">
              <div className="flex justify-between">
                <h4 className="text-xl font-bold text-purple-300">University of Central Florida</h4>
                <span className="text-gray-400">2025</span>
              </div>
              <p className="text-gray-300">B.S. in Computational Mathematics, Minor in Computer Science</p>
              <p className="text-gray-400">GPA: 3.77 • Provost Scholarship Recipient</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-pragati mb-4 text-2xl font-bold text-white">
              Certifications
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-purple-300">Fundamentals of SQL - Tripleten</span>
                <span className="text-gray-400">2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">MongoDB Atlas Certification</span>
                <span className="text-gray-400">2023</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-pragati mb-4 text-2xl font-bold text-white">
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">Python</span>
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">TypeScript</span>
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">Java</span>
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">SQL</span>
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">C</span>
              
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">React</span>
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">Tailwind</span>
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">LangChain</span>
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">Docker</span>
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">Git</span>
              
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">Google Cloud</span>
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">Azure AI</span>
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">Machine Learning</span>
              <span className="rounded-full bg-purple-900 px-4 py-1 text-sm text-white">NLP</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[
                { name: "Python", level: 95 },
                { name: "TypeScript", level: 70 },
                { name: "Cooking", level: 30 },
                { name: "React", level: 70 },
                { name: "Git / Docker", level: 85 },
                { name: "Sleeping 8hrs a night", level: 40 }
              ].map((skill) => (
                <div key={skill.name} className="relative">
                  <div className="flex justify-between mb-1">
                    <span className="text-purple-300">{skill.name}</span>
                    <span className="text-gray-400">{skill.level}%</span>
                  </div>
                  <div className="h-2 bg-purple-900/30 rounded-full">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                      style={{ width: `${skill.level}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-8">
        <a
          href="https://drive.google.com/file/d/1r92KYtDKGoQkSSIZv7QK-a-EkmhP7gYF/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="transform rounded-lg bg-purple-900 px-6 py-3 text-lg font-bold text-white transition-all hover:scale-105 hover:bg-purple-800 active:scale-95 mt-8"
        >
          📄 View as PDF
        </a>
      </div>

      {/* Decorative Elements */}
      <NeonTkSVG className="absolute -left-20 top-20 h-[300px] w-full max-w-[400px] transform text-purple-400 opacity-30" />
      <SwordSVG className="absolute -right-20 bottom-20 h-auto w-full max-w-[400px] transform text-purple-400 opacity-30" />
    </div>
  );
}