"use client";

import { Card } from "@forge/ui/card";
import { useScrollAnimation } from "../_hooks/useScrollAnimation";

export function AboutSection() {
  const { ref, isVisible } = useScrollAnimation(0.2);

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      {/* Animated background bubbles */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-20 h-20 bg-primary rounded-full animate-bubble-float"
            style={{
              left: `${(i * 15) % 100}%`,
              top: `${(i * 20) % 80}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${4 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <h2 className={`text-4xl md:text-5xl font-bold text-center mb-12 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          About Me
        </h2>
        
        <Card className={`max-w-4xl mx-auto p-8 md:p-12 shadow-xl transition-all duration-700 delay-200 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <div className="space-y-6 text-lg leading-relaxed">
            <p>
              Hi! I'm Kevin Rodriguez, a passionate full-stack developer with a love for building
              web applications. I'm excited about the opportunity to join the Knight Hacks dev team 
              and contribute to creating amazing experiences for the hackathon community.
            </p>
            
            <p>
              I believe in writing clean, maintainable code and continuously learning new
              technologies. My goal is to not only contribute technically but also to collaborate
              with the team to solve challenging problems and deliver impactful solutions.
            </p>

          </div>

          {/* Stats*/}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 pt-8 border-t">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">5+</div>
              <div className="text-sm text-muted-foreground">Years Coding</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">4+</div>
              <div className="text-sm text-muted-foreground">Projects Built</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
