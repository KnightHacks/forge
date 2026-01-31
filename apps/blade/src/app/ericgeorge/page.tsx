"use client";

import React, { useState, useEffect } from "react";
import { GeistMono } from "geist/font/mono";
import { cn } from "@forge/ui";
import { FaLinkedin } from "react-icons/fa";
import Link from "next/link";

const PIPBOY_GREEN = "#1aff80";
const PIPBOY_GREEN_GLOW = "rgba(26, 255, 128, 0.45)";

const Page = () => {
    const [activeTab, setActiveTab] = useState("INTRO");
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const tabs = ["INTRO", "PROJECTS", "CONTACT"];

    return (
        <div
            className={cn(
                "relative flex min-h-screen flex-col overflow-hidden bg-[#020502] selection:bg-[#1aff8033]",
                GeistMono.className,
            )}
            style={{ color: PIPBOY_GREEN }}
        >
            {/* 
          CURVATURE & SCANLINE OVERLAYS
          These are fixed to the viewport to provide the global "monitor" feel
      */}
            <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">

                {/* DRASTIC SCANLINES: Higher contrast and larger size for that low-res feel */}
                <div
                    className="absolute inset-0 opacity-[0.35] mix-blend-multiply"
                    style={{
                        backgroundImage: `repeating-linear-gradient(0deg, rgba(0, 0, 0, 1) 0px, rgba(0, 0, 0, 1) 2px, transparent 2.5px, transparent 4px)`,
                    }}
                />

                {/* CHROMATIC ABERRATION: Subtle RGB bleed at the edges */}
                <div className="absolute inset-0 opacity-[0.15] mix-blend-screen"
                    style={{
                        backgroundImage: `radial-gradient(circle at center, transparent 40%, rgba(255, 0, 0, 0.4) 90%, rgba(0, 0, 255, 0.4) 100%)`
                    }}
                />


                <div className="absolute inset-0 bg-[#1aff8008] blur-[2px]" />

                <div className="animate-grain absolute -inset-[100%] opacity-[0.04] grayscale contrast-[200%]"
                    style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }} />


                <div className="animate-flicker absolute inset-0 mix-blend-overlay opacity-80" />


                <div
                    className="absolute inset-0 shadow-[inset_0_0_15vw_rgba(0,0,0,0.6)]"
                    style={{
                        background: `radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.3) 100%)`
                    }}
                />

                <div className="animate-scan-bar absolute left-0 h-[25vh] w-full bg-[#1aff8005] blur-[40px]" />
            </div>


            <div className="relative z-10 flex min-h-screen flex-col transform-gpu"
                style={{
                    perspective: '1200px',
                }}>

                <div className="flex flex-1 flex-col p-6 lg:p-12 xl:p-20"
                    style={{
                        transform: 'translateZ(20px) scale(0.98)',
                    }}>

                    {/* Header */}
                    <header className="mb-10 border-b-4 border-current pb-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <nav className="flex flex-wrap gap-x-12 gap-y-6">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "text-3xl font-black tracking-tighter transition-all lg:text-4xl",
                                            activeTab === tab
                                                ? "scale-110 text-glow drop-shadow-[0_0_20px_rgba(26,255,128,0.95)]"
                                                : "opacity-20 hover:opacity-100"
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </nav>

                            <div className="flex items-center gap-10 text-2xl font-black uppercase tracking-[0.3em] opacity-50 drop-shadow-[0_0_8px_rgba(26,255,128,0.4)]">
                                <Link href="https://www.linkedin.com/in/eric-george-90a26a278/">
                                    <FaLinkedin size={40} className="hover:scale-110 " />
                                </Link>
                                <Link href="/resume.pdf">
                                    <svg className="w-10 h-10 hover:scale-110" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </Link>
                                <Link href="https://github.com/myr124">
                                    <svg className="w-10 h-10 hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                    </svg>
                                </Link>
                                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                        </div>
                    </header>

                    {/* Main Content Sections */}
                    <main className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                        <div className="mx-auto max-w-7xl animate-startup">
                            {activeTab === "INTRO" && <IntroContent />}
                            {activeTab === "PROJECTS" && <ProjectsContent />}
                            {activeTab === "CONTACT" && <ContactContent />}

                        </div>
                    </main>

                    {/* Footer Dashboard */}
                    <footer className="mt-16 border-t-4 border-current pt-12 font-black uppercase tracking-[0.25em]">
                        <div className="grid grid-cols-1 gap-16 lg:grid-cols-4 lg:gap-12">
                            <div className="col-span-1 lg:col-span-2 flex flex-col gap-5">
                                <div className="flex justify-between text-lg lg:text-2xl">
                                    <span>STATUS: NGMI</span>
                                </div>
                                <div className="h-4 w-full border-4 border-current/20 bg-current/5 p-1">
                                    <div className="h-full bg-current shadow-[0_0_30px_rgba(26,255,128,1)] transition-all duration-300" style={{ width: '100%' }} />
                                </div>
                                <div className="flex justify-between text-xs lg:text-sm tracking-widest opacity-40">
                                    <span>HP 320/320</span>
                                    <span>99% EFFICIENCY</span>
                                </div>
                            </div>

                            <div className="col-span-1 flex flex-col gap-5">

                            </div>

                            <div className="col-span-1 flex flex-col justify-end text-right">
                                <div className="text-4xl lg:text-6xl tracking-tighter drop-shadow-[0_0_10px_rgba(26,255,128,0.6)]">LVL 10</div>
                                <div className="mt-3 h-2 w-full border-2 border-current/30 bg-current/5 lg:w-48 lg:ml-auto">
                                    <div className="h-full bg-current/60" style={{ width: '65%' }} />
                                </div>
                            </div>
                        </div>
                    </footer>

                </div>
            </div>

            <style jsx global>{`
        @keyframes flicker {
          0%, 100% { opacity: 0.99; filter: contrast(100%) brightness(100%); }
          1% { opacity: 0.9; filter: contrast(120%) brightness(115%); }
          2% { opacity: 0.98; }
          4% { opacity: 0.92; filter: contrast(130%) brightness(120%); }
          5% { opacity: 0.99; }
          6% { opacity: 0.95; }
        }
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2%, -8%); }
          30% { transform: translate(-12%, 4%); }
          50% { transform: translate(3%, -18%); }
          70% { transform: translate(-8%, 18%); }
          90% { transform: translate(12%, 0%); }
        }
        @keyframes scan-bar {
          0% { top: -25vh; opacity: 0; }
          20% { opacity: 0.15; }
          80% { opacity: 0.15; }
          100% { top: 125vh; opacity: 0; }
        }
        @keyframes startup {
          0% { opacity: 0; filter: blur(20px) brightness(4) scale(1.1); }
          30% { opacity: 0.8; filter: blur(10px) brightness(2) scale(1.05); }
          50% { opacity: 0.3; filter: blur(5px) brightness(1.5) scale(1.02); }
          100% { opacity: 1; filter: blur(0) brightness(1) scale(1); }
        }
        
        .animate-flicker {
          animation: flicker 0.12s infinite;
        }
        .animate-grain {
          animation: grain 0.5s steps(3) infinite;
        }
        .animate-scan-bar {
          animation: scan-bar 12s linear infinite;
        }
        .animate-startup {
          animation: startup 1.8s cubic-bezier(0.19, 1, 0.22, 1);
        }
        
        .text-glow {
          text-shadow: 0 0 15px rgba(26,255,128,0.8);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(26, 255, 128, 0.05);
          border-left: 2px border-current/20;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(26, 255, 128, 0.4);
          border: 2px solid #020502;
        }

        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-cursor {
          animation: cursor-blink 0.8s step-end infinite;
        }

        /* CRT Bulge Simulation */
        body {
          background: #000;
        }
      `}</style>
        </div>
    );
};

const TypewriterText = ({ text, delay = 50, startDelay = 0 }: { text: string; delay?: number; startDelay?: number }) => {
    const [displayText, setDisplayText] = useState("");
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        let currentText = "";
        let index = 0;

        const type = () => {
            if (index < text.length) {
                currentText += text[index];
                setDisplayText(currentText);
                index++;
                timeout = setTimeout(type, delay);
            } else {
                setIsComplete(true);
            }
        };

        const startTimeout = setTimeout(type, startDelay);
        return () => {
            clearTimeout(startTimeout);
            clearTimeout(timeout);
        };
    }, [text, delay, startDelay]);

    return (
        <span className="relative">
            {displayText}
            {!isComplete && (
                <span className="ml-1 inline-block h-[1em] w-[0.5em] animate-cursor bg-current align-middle shadow-[0_0_8px_rgba(26,255,128,0.8)]" />
            )}
        </span>
    );
};

const IntroContent = () => (
    <div className="grid h-full grid-cols-12 gap-8 lg:gap-16 py-12 items-center">
        {/* Profile Image with CRT Filter */}
        <div className="col-span-12 lg:col-span-4 flex justify-center lg:justify-start">
            <div className="relative group">
                {/* Decorative Frame */}
                <div className="absolute -inset-4 border-2 border-current opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="absolute -inset-2 border border-current opacity-10" />

                <div className="relative aspect-square w-64 lg:w-full max-w-[400px] overflow-hidden border-4 border-current/20 bg-current/5 shadow-[0_0_50px_rgba(26,255,128,0.15)]">
                    <img
                        src="/profile.jpg"
                        alt="Eric George"
                        className="h-full w-full object-cover opacity-70 mix-blend-screen"
                        style={{
                            filter: 'grayscale(100%) brightness(1.1) contrast(1.1) sepia(100%) hue-rotate(90deg) saturate(400%)'
                        }}
                    />
                    {/* Image Scanline Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-15"
                        style={{
                            backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 3px)`,
                            backgroundSize: '100% 4px'
                        }}
                    />
                    {/* Vignette on image */}
                    <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]" />
                </div>


            </div>
        </div>

        {/* Intro Text */}
        <div className="col-span-12 lg:col-span-8 flex flex-col justify-center gap-10">
            <div className="flex flex-col gap-6">
                <h1 className="text-4xl lg:text-6xl font-black uppercase tracking-[0.25em] leading-[1.1] text-glow">
                    <TypewriterText text="Hello my name is Eric George" />
                </h1>
                <div className="space-y-6">
                    <p className="text-2xl lg:text-3xl font-black uppercase tracking-[0.15em] leading-relaxed opacity-80">
                        <TypewriterText
                            text="I'm a developer passionate about building and engaging in new technologies"
                            startDelay={2000}
                            delay={40}
                        />
                    </p>
                    <p className="text-2xl lg:text-3xl font-black uppercase tracking-[0.15em] leading-relaxed opacity-60">
                        <TypewriterText
                            text="I am currently a Software Engineer Intern at Siemens Energy and the Computer Science Technical chair for UCF SASE"
                            startDelay={4000}
                            delay={30}
                        />
                    </p>
                    <p className="text-2xl lg:text-3xl font-black uppercase tracking-[0.15em] leading-relaxed opacity-60">
                        <TypewriterText
                            text="I love attending hackathons, I've been to 7 so far and have won 4 prizes with a 1st and 2nd place finish at Knighthacks and Swamphacks respectively"
                            startDelay={4000}
                            delay={30}
                        />
                    </p>
                </div>
            </div>
        </div>
    </div>
);

const ProjectsContent = () => (
    <div className="grid h-full grid-cols-12 gap-8 lg:gap-16 py-12 items-center">


        {/* Project Details */}
        <div className="col-span-10 lg:col-span-8 flex flex-col justify-center gap-10">
            <div className="flex flex-col gap-6">
                <h1 className="text-4xl lg:text-6xl font-black uppercase tracking-[0.25em] leading-[1.1] text-glow">
                    <TypewriterText text="SIGNHERO" />
                </h1>
                <div className="space-y-6">
                    <p className="text-2xl lg:text-3xl font-black uppercase tracking-[0.15em] leading-relaxed opacity-80">
                        A really fun game that we designed at Swamphacks to help people learn ASL. It was basically a combo of Guitar Hero and DDR but with ASL. My favorite part about this project was that it ended up being a pretty solid game at the end of it. We had tons of people swarm our table to try it out!
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-l-4 border-current pl-4 py-2">
                            <h3 className="text-lg font-bold opacity-40 uppercase">AWARDS</h3>
                            <p className="text-xl font-black uppercase">2nd Place @ Swamphacks</p>
                            <p className="text-xl font-black uppercase">Best Game Design @ Swamphacks</p>
                        </div>
                        <div className="border-l-4 border-current pl-4 py-2">
                            <h3 className="text-lg font-bold opacity-40 uppercase">TECH STACK</h3>
                            <p className="text-xl font-black uppercase text-xs">MobileNetV2 • MediaPipe • Real-time AI</p>
                        </div>
                    </div>
                    <p className="text-xl font-bold uppercase tracking-[0.1em] leading-relaxed opacity-60">
                        <TypewriterText
                            text="Built with a custom machine learning pipeline achieving 30-50ms latency for seamless gameplay."
                            startDelay={3000}
                            delay={30}
                        />
                    </p>
                    <Link
                        href="https://devpost.com/software/signhero"
                        target="_blank"
                        className="inline-block w-fit border-2 border-current px-6 py-2 font-black uppercase hover:bg-current hover:text-black transition-all"
                    >
                        View Project on Devpost
                    </Link>
                </div>
            </div>
            <div className="flex flex-col gap-6">
                <h1 className="text-4xl lg:text-6xl font-black uppercase tracking-[0.25em] leading-[1.1] text-glow">
                    <TypewriterText text="Emergent" />
                </h1>
                <div className="space-y-6">
                    <p className="text-2xl lg:text-3xl font-black uppercase tracking-[0.15em] leading-relaxed opacity-80">
                        Emergent was a cool project that me and my friends built at Knighthacks. Its essentially a crisis-management simulation software that aims to streamline and improve the way that organizations simulate disasters. It was a really engaging problem to delve into and also very fun to build.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-l-4 border-current pl-4 py-2">
                            <h3 className="text-lg font-bold opacity-40 uppercase">AWARDS</h3>
                            <p className="text-xl font-black uppercase">1st Place @ Knighthacks</p>
                            <p className="text-xl font-black uppercase">2nd Place in Google ADK Challenge @ Knighthacks</p>
                        </div>
                        <div className="border-l-4 border-current pl-4 py-2">
                            <h3 className="text-lg font-bold opacity-40 uppercase">TECH STACK</h3>
                            <p className="text-xl font-black uppercase text-xs">Google ADK • NextJS • ElevenLabs</p>
                        </div>
                    </div>
                    <p className="text-xl font-bold uppercase tracking-[0.1em] leading-relaxed opacity-60">
                        <TypewriterText
                            text="Generated simulations with over 100 personas in under 30 seconds"
                            startDelay={3000}
                            delay={30}
                        />
                    </p>
                    <Link
                        href="https://devpost.com/software/emergent-b2t1fl"
                        target="_blank"
                        className="inline-block w-fit border-2 border-current px-6 py-2 font-black uppercase hover:bg-current hover:text-black transition-all"
                    >
                        View Project on Devpost
                    </Link>
                </div>
            </div>
        </div>
    </div>
);

const ContactContent = () => (
    <div className="flex h-full flex-col justify-center py-12 max-w-4xl">
        <h1 className="text-5xl lg:text-7xl font-black uppercase tracking-[0.3em] mb-12 text-glow">
            <TypewriterText text="CONNECT" />
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
                { label: "LINKEDIN", value: "eric-george-90a26a278", href: "https://www.linkedin.com/in/eric-george-90a26a278/" },
                { label: "GITHUB", value: "myr124", href: "https://github.com/myr124" },
                { label: "EMAIL", value: "ericgeo324@gmail.com", href: "mailto:ericgeo324@gmail.com" },
                { label: "LOCATION", value: "ORLANDO, FL", href: "#" },
            ].map((contact, i) => (
                <div key={contact.label} className="group flex flex-col gap-2">
                    <span className="text-sm font-bold opacity-40 uppercase">{contact.label}</span>
                    <Link
                        href={contact.href}
                        target={contact.href.startsWith("http") ? "_blank" : undefined}
                        className="text-2xl lg:text-3xl font-black uppercase tracking-widest group-hover:text-glow transition-all"
                    >
                        <TypewriterText text={contact.value} startDelay={i * 500} />
                    </Link>
                </div>
            ))}
        </div>

    </div>
);



export default Page;
