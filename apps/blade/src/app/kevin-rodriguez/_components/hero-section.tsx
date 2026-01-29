"use client";

import { Button } from "@forge/ui/button";
import pfp from '../icons/chibi_icon.png';

export function HeroSection() {
  const handleLinkedIn = () => {
    window.open("https://linkedin.com/in/kevinarodriguez25", "_blank");
  };

  return (
    <section className="min-h-[60vh] py-16 flex items-center justify-center relative overflow-hidden">
      {/* Animated background bubbles */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-24 h-24 bg-primary rounded-full animate-pulse"
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-16 h-16 bg-primary rounded-full animate-pulse"
        />
        <div 
          className="absolute top-1/2 right-1/3 w-12 h-12 bg-primary rounded-full animate-bounce"
        />
        <div 
          className="absolute top-3/4 left-1/2 w-14 h-14 bg-primary rounded-full animate-bubble-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Profile picture/avatar */}
        <div className="mb-6 animate-fade-in">
          <div className="relative inline-block">
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-6xl font-bold mx-auto animate-float shadow-2xl">
              <img
                src={pfp.src}
                alt="Kevin Rodriguez"
                className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-2xl"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <span className="text-2xl">💻</span>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <h1 className="text-4xl md:text-5xl font-bold mb-3 animate-slide-up">
          Kevin Rodriguez
        </h1>
        <p 
          className="text-lg md:text-xl text-muted-foreground mb-1 animate-slide-up" 
          style={{ animationDelay: "0.1s" }}
        >
          Full-Stack Developer
        </p>
        <p 
          className="text-base md:text-lg text-muted-foreground mb-6 animate-slide-up" 
          style={{ animationDelay: "0.2s" }}
        >
          Knight Hacks Dev Team Application
        </p>

        {/* Call-to-action buttons */}
        <div 
          className="flex flex-wrap gap-4 justify-center animate-slide-up" 
          style={{ animationDelay: "0.3s" }}
        >
          <Button size="lg" onClick={handleLinkedIn}>
            View LinkedIn
          </Button>
        </div>
      </div>
    </section>
  );
}
