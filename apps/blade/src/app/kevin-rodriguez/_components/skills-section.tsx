"use client";

import { Card } from "@forge/ui/card";
import { Badge } from "@forge/ui/badge";
import { useScrollAnimation } from "../_hooks/useScrollAnimation";

const skills = [
  { name: "JavaScript", icon: "💛" },
  { name: "TypeScript", icon: "💙" },
  { name: "React", icon: "⚛️" },
  { name: "Next.js", icon: "▲" },
  { name: "Node.js", icon: "🟢" },
  { name: "Express", icon: "🚂" },
  { name: "PostgreSQL", icon: "🐘" },
  { name: "Tailwind CSS", icon: "🎨" },
  { name: "Git", icon: "📦" },
  { name: "REST APIs", icon: "🔌" },
  { name: "HTML/CSS", icon: "🌐" },
  { name: "Python", icon: "🐍" },
];

const interests = [
  "Full-Stack Development",
  "UI/UX Design",
  "Open Source",
  "Backend Systems",
  "Developer Tools",
  "Database Management",
];

export function SkillsSection() {
  const { ref, isVisible } = useScrollAnimation(0.2);

  return (
    <section ref={ref} className="py-20 bg-muted/30 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 animate-gradient" />
      
      <div className="container mx-auto px-4 relative z-10">
        <h2 className={`text-4xl md:text-5xl font-bold text-center mb-12 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          Skills & Technologies
        </h2>
        
        <Card className={`max-w-5xl mx-auto p-8 md:p-12 shadow-xl transition-all duration-700 delay-200 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          {/* Skills Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
            {skills.map((skill, index) => (
              <Badge
                key={skill.name}
                variant="secondary"
                className={`text-center py-4 text-base font-medium hover:scale-105 transition-all duration-500 cursor-default flex items-center justify-center gap-2 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${300 + index * 50}ms` }}
              >
                <span className="text-xl">{skill.icon}</span>
                <span>{skill.name}</span>
              </Badge>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t my-8" />

          {/* Interests Section */}
          <div>
            <h3 className="text-2xl font-bold mb-6 text-center">Areas of Interest</h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {interests.map((interest, index) => (
                <Badge
                  key={interest}
                  className="py-2 px-4 text-sm animate-fade-in hover:bg-primary/90 transition-colors cursor-default"
                  style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
