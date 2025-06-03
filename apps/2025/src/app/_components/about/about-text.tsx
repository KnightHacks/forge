'use client';

import { useEffect, useState } from 'react';
import Logo from "../logo";
import TextBox from "../textbox";

const AboutText = () => {
    const [logoSize, setLogoSize] = useState(50);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setLogoSize(
                width >= 768 ? 200 : 
                width >= 700 ? 150 : 
                width >= 650 ? 100 : 
                width >= 480 ? 100 : 
                75
            );
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="relative m-10">
            <div className="flex items-start">
                <TextBox width="70%" height="100%" className="mt-4 sm:mt-6 md:mt-8">
                    <p>
                        <em>In the not so distant future...</em>
                    </p>
                </TextBox>
            </div>
            <div className="flex items-start relative -ml-8">
                <div className="absolute -top-15 sm:-top-25 md:-top-30 -right-2 sm:-right-3 md:-right-15 z-10">
                    <Logo size={logoSize} />
                </div>
                <TextBox width="100%" height="100%" className="m-4 sm:m-6 md:m-8">
                    <p>
                        The University of Central Florida's premier hackathon, 
                        <em><strong> KNIGHT HACKS VII, </strong></em> 
                        emerges from the shadows...

                        <br /><br />

                        During the 36-hour coding showdown, hackers will enlist the power of workshops, 
                        swag, tech talks, side quests, free food, games, and commnity to save the world!
                    </p>
                </TextBox>
            </div>
            <div className="flex items-start ml-8">
                <TextBox width="93%" height="100%" className="mb-8 sm:mb-12 md:mb-16">
                    <p>
                        Our friends 
                        <span className="text-[#1570AD]"> T.K. </span>
                        and
                        <span className="text-[#C1272D]"> Lenny </span>
                        are at straits, and it's 
                        <em><strong> your </strong></em>
                        job to settle the matter once and for all.

                        <br /><br />

                        In a world where innovation is war and bugs are monsters, Hackers have a choice...
                    </p>
                </TextBox>
            </div>
        </div>
    );
};

export default AboutText;