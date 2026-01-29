"use client";

import { Card } from "@forge/ui/card";
import { Badge } from "@forge/ui/badge";
import { useState } from "react";
import { useScrollAnimation } from "../_hooks/useScrollAnimation";

// Import images
import cyclopBackpack from "../projects-images/cyclops/cyclops-backpack.jpg";
import testRun from "../projects-images/cyclops/test-run.PNG";
import emailVerif from "../projects-images/playedit/email-verif.png";
import gameCover from "../projects-images/playedit/game-cover.png";
import gamesList from "../projects-images/playedit/games-list.png";

interface Project {
  title: string;
  subtitle: string;
  date: string;
  description: string[];
  technologies: string[];
  images: any[];
}

const projects: Project[] = [
  {
    title: "Cyclops - KnightHacks VIII",
    subtitle: "AI-Driven Safety System",
    date: "Jan. 2025 - Present",
    description: [
      "Engineered an AI-driven backpack-mounted safety system that achieved 90% accuracy in detecting potential threats using YOLOv11 and DeepSORT for real-time object tracking.",
      "Integrated Firebase Cloud Messaging with an Android app to deliver sub-2-second alerts when suspicious activity was detected in the user's blind spot.",
      "Enhanced environmental awareness by fusing ultrasonic sensor data (Arduino) with CV outputs, improving detection confidence by 20%."
    ],
    technologies: ["YOLOv11", "DeepSORT", "Gemini API", "Firebase", "Arduino", "Android"],
    images: [cyclopBackpack, testRun]
  },
  {
    title: "PlayedIt",
    subtitle: "Game Discovery & Recommendation Platform",
    date: "Sept. 2025 - Nov. 2025",
    description: [
      "Designed and implemented 30+ RESTful API endpoints to support authentication, user/developer profiles, game listings, and personalized recommendations—reducing backend response times by ~40%.",
      "Engineered a scalable MongoDB data model and optimized retrieval using Mongoose aggregation pipelines, cutting database load by ~30% during high-traffic operations.",
      "Integrated external IGDB-style game metadata to support advanced search, sorting, pagination, and dynamic cover fetching—enabling 50,000+ games to be browsed smoothly."
    ],
    technologies: ["MongoDB", "Express.js", "React", "Node.js", "IGDB API", "Machine Learning"],
    images: [emailVerif, gameCover, gamesList]
  }
];

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { ref, isVisible } = useScrollAnimation(0.1);

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev - 1 + project.images.length) % project.images.length);
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % project.images.length);
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 200}ms` }}
    >
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
        {/* Screenshot Carousel */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden group">
          {project.images[currentImageIndex] && (
            <img
              src={project.images[currentImageIndex].src}
              alt={`${project.title} screenshot ${currentImageIndex + 1}`}
              className="w-full h-full object-cover transition-opacity duration-500"
            />
          )}

          {/* Left/Right navigation buttons */}
          {project.images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-0 top-0 h-full w-1/2 flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Previous image"
              >
                <span className="bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70">
                  ‹
                </span>
              </button>
              <button
                onClick={goToNext}
                className="absolute right-0 top-0 h-full w-1/2 flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Next image"
              >
                <span className="bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70">
                  ›
                </span>
              </button>
            </>
          )}

          {/* Image indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
            {project.images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentImageIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to screenshot ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Project Details */}
        <div className="p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-2xl font-bold mb-1">{project.title}</h3>
            <p className="text-sm text-muted-foreground mb-1">{project.subtitle}</p>
            <p className="text-xs text-muted-foreground">{project.date}</p>
          </div>

          {/* Tech Stack */}
          <div className="flex flex-wrap gap-2 mb-4">
            {project.technologies.map((tech) => (
              <Badge key={tech} variant="secondary" className="text-xs">
                {tech}
              </Badge>
            ))}
          </div>

          {/* Description */}
          <ul className="space-y-2 text-sm flex-grow">
            {project.description.map((item, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-primary mt-1">▸</span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      </Card>
    </div>
  );
}

export function ProjectsSection() {
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-24 h-24 bg-primary rounded-full animate-bubble-float"
            style={{
              left: `${(i * 18) % 90}%`,
              top: `${(i * 25) % 75}%`,
              animationDelay: `${i * 1.2}s`,
              animationDuration: `${5 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <h2
          className={`text-4xl md:text-5xl font-bold text-center mb-4 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          Featured Projects
        </h2>
        <p
          className={`text-center text-muted-foreground mb-12 transition-all duration-700 delay-100 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          A selection of my recent work and hackathon projects
        </p>

        <div className="max-w-6xl mx-auto space-y-8">
          {projects.map((project, index) => (
            <ProjectCard key={project.title} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
