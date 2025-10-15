"use client";

import { useState, useEffect, useRef } from "react";
import { EmailSectionOne } from "./emailp1";
import { EmailSectionTwo } from "./emailp2";

export const EmailDash = () => {
    const [showSectionTwo, setShowSectionTwo] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const sectionTwoRef = useRef<HTMLDivElement>(null);
    const sectionOneRef = useRef<HTMLDivElement>(null);

    const handleSchedule = () => {
        setShowSectionTwo(true);
        setIsClosing(false);
    };

    const handleClose = () => {
        setIsClosing(true);
        window.scrollTo({ 
            top: 0, 
            behavior: 'smooth' 
        });
        setTimeout(() => {
            setShowSectionTwo(false);
            setIsClosing(false);
        }, 700); 
    };

    useEffect(() => {
        if (showSectionTwo && !isClosing && sectionTwoRef.current) {
            sectionTwoRef.current.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, [showSectionTwo, isClosing]);

    return (
        <div className="py-20">
            <div ref={sectionOneRef}>
                <EmailSectionOne onSchedule={handleSchedule} />
            </div>
            {showSectionTwo && (
                <div ref={sectionTwoRef}>
                    <EmailSectionTwo onClose={handleClose} isClosing={isClosing} />
                </div>
            )}
        </div>
    )
};