'use client'; // normally it's better to render landing page server-side
// but it doesn't seem to matter much here so i'll have some fun
import NavButton from "./components/NavButton";
import ParticleComponent from "./components/Particles";
import { socialInfo } from "./components/SocialData";
import Social from "./components/Social";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";


export default function Gurt() {

    // stateful variables to track the stages of a blinking animation
    // and which content should be loaded on the page
    const [phase, setPhase] = useState<"idle" | "blinkingIn" | "showingImage" | "blinkingOut">("idle");
    const [content, setContent] = useState<"page" | "picture">("page");

    // Handle timing
    useEffect(() => {
    let timer: NodeJS.Timeout;

    if (phase === "blinkingIn") {
        // first-half of blink
        timer = setTimeout(() => {
            // once screen is black, bring meowl out
            setContent("picture");
            setPhase("showingImage");
      }, 800);
    } else if (phase === "showingImage") {
        timer = setTimeout(() => setPhase("blinkingOut"), 2000); // show picture for 2s
    } else if (phase === "blinkingOut") {
        timer = setTimeout(() => {
            // once screen is black, bring normal page back out
            setContent("page");
            setPhase("idle");
      }, 800);
    }

    return () => clearTimeout(timer);
    }, [phase]);

    return (
        <div className="flex flex-col min-h-screen">
            
            
            {/* Main content of page */}
            {content === "page" ? (
                <>
                {/* Adding the navbar to the top of the page */}
                <div>
                    <NavButton check={true} />
                </div>

                {/* Adding the particles to the background */}
                <div className="absolute inset-0 z-0 blur-xs">
                    <ParticleComponent />
                </div>

                <main className="h-screen flex flex-row justify-center items-center z-20">
                <div className="flex flex-col text-center text-white w-full gap-2 fade-in">
                    <p className="text-4xl md:text-5xl text-bold">Josh Sawyer</p>
                    <p className="text-3xl md:text-4xl">(again...)</p>
                    <p 
                        onClick={() => {setPhase("blinkingIn")}} 
                        className="text-md md:text-lg italic underline hover:cursor-pointer"
                    >
                        (agurt....)
                    </p>
                    

                    {/* Mapping the socials + resume */}
                    <div className="flex flex-row mx-auto my-2">
                        {socialInfo.map((social) => (
                            <Social key={social.key} img={social.img} link={social.link} altText={social.altText} />
                        ))}
                    </div>
                    <p className="text-lg md:text-xl">(the portfolio site is on its way, trust 🙏🙏🙏)</p>
                </div>
            </main>
            </>
            ) : (
                <div className="">
                    {/* Meowl cameo */}
                    <img
                        src="/meowl.png"
                        alt="meowl cameo"
                        className="h-full w-full" />
                </div>
            )}


            {/* Blinking animation */}
            <AnimatePresence>
                {(phase === "blinkingIn" || phase === "blinkingOut") && (
                    <>
                        {/* Top half of the blink */}
                        <motion.div
                            key="top"
                            className="absolute top-0 left-0 w-full bg-black z-50"
                            initial={{ height: 0 }}
                            animate={{ height: "50%" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                        />
                        {/* Bottom half of the blink */}
                        <motion.div
                            key="bottom"
                            className="absolute bottom-0 left-0 w-full bg-black z-50"
                            initial={{ height: 0 }}
                            animate={{ height: "50%" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                        />
                    </>
                )}
            </AnimatePresence>
            
        </div>
    );
}