"use client";

import Image from "next/image";
import { useState } from "react";

const selfies: string[] = [
    "/assets/me.gif",
    "/assets/selfie.png",
    "/assets/slayqueen.gif",
    "/assets/side-eye-dog.gif",
]

export default function Slider() {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextImage = () => {
        setCurrentIndex((prev) =>
            prev === selfies.length - 1 ? 0 : prev + 1
        );
    };

    const prevImage = () => {
        setCurrentIndex((prev) =>
            prev === 0 ? selfies.length - 1 : prev - 1
        );
    };

    return (
        <div className="w-full max-w-[500px] h-auto flex flex-col items-center justify-center bg-[#91B786] border-8 border-double border-[#565939] rounded-xl shadow-lg overflow-visible p-6">
            <h2 className="text-2xl font-bold underline mb-1">ABOUT ME</h2>
            <p>FYI: Click on the carousel. It's a good day too be coding. ◡̈</p>

            <p className="font-semibold text-xl">Pictures of me:</p>
            <div className="relative w-80 aspect-square overflow-hidden rounded-xl transition-transform hover:scale-105">
                {selfies[currentIndex] && (
                    <Image 
                        key={currentIndex}
                        src={selfies[currentIndex]} 
                        alt="me"
                        width={300}
                        height={300}
                        className="w-full h-full object-cover"
                    />
                )}
                {/* prev/next buttons */}
                {selfies.length > 1 && (
                    <>
                        <button
                            onClick={prevImage}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 p-1 rounded-full hover:bg-black/70 transition cursor-pointer"
                        >
                            <span className="text-xl font-bold">&lt;</span>
                        </button>
                        <button
                            onClick={nextImage}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 p-1 rounded-full hover:bg-black/70 transition cursor-pointer"
                        >
                            <span className="text-xl font-bold">&gt;</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}