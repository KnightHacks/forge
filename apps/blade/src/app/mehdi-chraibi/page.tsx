"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

const projects = [
    {
        name: "ParkUCF",
        image: "/parkucf.jpg",
        link: "https://parkucf.mehdi.ch",
        caption: "An AI-powered parking dashboard for UCF students",
        date: "October - December 2025",
    },
    {
        name: "Sup, Chat?",
        image: "/supchat.jpg",
        link: "https://devpost.com/software/sup-chat",
        caption: "Fake AI chat for streamer confidence",
        date: "October 2025",
    },
    {
        name: "WikiParty",
        image: "/wikiparty.png",
        link: "https://devpost.com/software/ai-oxndzh",
        caption: "Multiplayer Wikipedia game desktop app",
        date: "October 2025",
    },
];

export default function MehdiChraibiPage() {
    const carouselRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const carousel = carouselRef.current;
        if (!carousel) return;

        let scrollAmount = 0;
        const speed = 0.5;

        const scroll = () => {
            scrollAmount += speed;
            if (scrollAmount >= carousel.scrollWidth / 2) {
                scrollAmount = 0;
            }
            carousel.scrollLeft = scrollAmount;
            requestAnimationFrame(scroll);
        };

        const animationId = requestAnimationFrame(scroll);
        return () => cancelAnimationFrame(animationId);
    }, []);

    return (
        <main className="dark flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[hsl(224,71.4%,4.1%)] px-4 py-12 text-[hsl(210,20%,98%)]">
            {/* Profile Section */}
            <div className="flex flex-col items-center gap-4">
                <div className="relative h-40 w-40 overflow-hidden rounded-full border-4 border-[hsl(263.4,70%,50.4%)] shadow-lg shadow-[hsl(263.4,70%,50.4%)]/30">
                    <Image
                        src="/headshot.jpg"
                        alt="Mehdi Chraibi"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">
                    Mehdi Chraibi
                </h1>
            </div>

            {/* Intro Section */}
            <p className="mt-6 max-w-xl text-center text-lg leading-relaxed text-[hsl(217.9,10.6%,64.9%)]">
                I am currently a junior at the University of Central Florida pursuing a
                Bachelor&apos;s in Computer Science with a focus in software
                engineering, data engineering and machine learning.
            </p>

            {/* Buttons Section */}
            <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                    href="https://github.com/mchdich"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-[hsl(215,27.9%,16.9%)] bg-[hsl(215,27.9%,16.9%)] px-5 py-3 font-medium transition-all duration-300 hover:border-[hsl(263.4,70%,50.4%)] hover:bg-[hsl(263.4,70%,50.4%)]/10 hover:shadow-lg hover:shadow-[hsl(263.4,70%,50.4%)]/20"
                >
                    <Image src="/github.png" alt="GitHub" width={20} height={20} />
                    GitHub
                </Link>
                <Link
                    href="https://linkedin.com/in/mehdichrai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-[hsl(215,27.9%,16.9%)] bg-[hsl(215,27.9%,16.9%)] px-5 py-3 font-medium transition-all duration-300 hover:border-[hsl(263.4,70%,50.4%)] hover:bg-[hsl(263.4,70%,50.4%)]/10 hover:shadow-lg hover:shadow-[hsl(263.4,70%,50.4%)]/20"
                >
                    <Image src="/linkedin.png" alt="LinkedIn" width={20} height={20} />
                    LinkedIn
                </Link>
                <Link
                    href="/Mehdi_Chraibi_Resume.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-[hsl(215,27.9%,16.9%)] bg-[hsl(215,27.9%,16.9%)] px-5 py-3 font-medium transition-all duration-300 hover:border-[hsl(263.4,70%,50.4%)] hover:bg-[hsl(263.4,70%,50.4%)]/10 hover:shadow-lg hover:shadow-[hsl(263.4,70%,50.4%)]/20"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Resume
                </Link>
            </div>

            {/* Projects Carousel Section */}
            <div className="mt-16 w-screen">
                <h2 className="mb-6 text-center text-2xl font-semibold">Projects</h2>
                <div
                    ref={carouselRef}
                    className="flex gap-8 overflow-hidden px-8"
                    style={{ scrollBehavior: "auto" }}
                >
                    {/* Duplicate projects for infinite scroll effect */}
                    {[...projects, ...projects].map((project, index) => (
                        <Link
                            key={`${project.name}-${index}`}
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex-shrink-0"
                        >
                            <div className="flex h-56 w-[32rem] overflow-hidden rounded-xl border border-[hsl(215,27.9%,16.9%)] transition-all duration-300 group-hover:border-[hsl(263.4,70%,50.4%)] group-hover:shadow-xl group-hover:shadow-[hsl(263.4,70%,50.4%)]/20">
                                {/* Left: Image */}
                                <div className="relative h-full w-1/2">
                                    <Image
                                        src={project.image}
                                        alt={project.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                                {/* Right: Info */}
                                <div className="flex w-1/2 flex-col justify-center bg-[hsl(215,27.9%,16.9%)] p-6">
                                    <span className="text-xs font-medium uppercase tracking-wider text-[hsl(263.4,70%,50.4%)]">
                                        {project.date}
                                    </span>
                                    <h3 className="mt-2 text-xl font-bold">{project.name}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-[hsl(217.9,10.6%,64.9%)]">
                                        {project.caption}
                                    </p>
                                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[hsl(263.4,70%,50.4%)] transition-colors group-hover:text-[hsl(262.1,83.3%,60%)]">
                                        View Project
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="transition-transform group-hover:translate-x-1"
                                        >
                                            <path d="M5 12h14" />
                                            <path d="m12 5 7 7-7 7" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
