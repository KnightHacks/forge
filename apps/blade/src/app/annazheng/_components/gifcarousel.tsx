"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import ToolTip from "./tooltip";

export default function GifCarousel({ img, size, audio }: { img:string; size:number; audio:string }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [mousePos, setMousePos] = useState({ x:0, y:0 });
    const [showToolTip, setShowToolTip] = useState(false);

    const toggleAudio = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            // pause and reset
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            // click play
            audioRef.current.currentTime = 0; //restart from beginning
            audioRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false)); //play() can fail is not user-initiated
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div 
            className="relative w-full group cursor-pointer" 
            onClick={toggleAudio}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setShowToolTip(true)}
            onMouseLeave={() => setShowToolTip(false)}
        >
            {/* hidden audio */}
            <audio ref={audioRef} src={audio} preload="auto" loop />

            {/* tooltip */}
            {showToolTip && (
                <ToolTip 
                    className="opacity-0 group-hover:opacity-100"
                    x={mousePos.x}
                    y={mousePos.y}
                    img={isPlaying ? "/assets/happy-cat.gif" : "/assets/selfie.png"}
                    text={isPlaying ? "Click again to stop" : "Click to bless your ears"} 
                />
            )}
            
            {/* gif carousel */}
            <div className="slider-track flex w-[200%]">
                {[...Array(3)].map((_, groupIdx) => (
                    <div key={groupIdx} className="flex shrink-0">
                        {[...Array(6)].map((_, gifIdx) => (
                            <Image 
                                key={gifIdx}
                                src={img}
                                alt="Chiikawa Gwenchana Ding Ding Ding"
                                width={size}
                                height={size}
                                className="mx-8"
                            />
                        ))}
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes slide-left {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .slider-track {
                    animation: slide-left 20s linear infinite;
                }
            `}</style>
        </div>
    );
}