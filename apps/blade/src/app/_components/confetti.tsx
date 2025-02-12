"use client";

import React, { useState } from 'react';
import ConfettiExplosion from 'confetti-explosion-react';

interface ConfettiProps {
    children: React.ReactNode;
}

const Confetti: React.FC<ConfettiProps> = ({ children }) => {
    const [confetti, setConfetti] = useState(false);

    const handleClick = () => {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 1000);
    };

    return (
        <div className="relative flex justify-center items-center" onClick={handleClick}>
            {children}
            {confetti && (
                <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                    <ConfettiExplosion />
                </div>
            )}
        </div>
    );
};

export default Confetti;