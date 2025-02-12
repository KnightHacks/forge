"use client";

import type { ReactNode } from 'react';

function useAudio(url: string) {
    const play = () => {
        const audio = new Audio(url);
        void audio.play();
    };

    return play;
}

interface SoundProps {
    children: ReactNode;
    audioUrl: string;
}

export function Sound({ children, audioUrl }: SoundProps) {
    const play = useAudio(audioUrl);

    return (
        <div className="flex justify-center" onClick={play}>
            {children}
        </div>
    );
}

