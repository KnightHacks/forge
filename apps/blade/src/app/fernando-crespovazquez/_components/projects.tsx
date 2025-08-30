"use client";

import React, { useState } from 'react';
import { GitHubLogoIcon, ArrowRightIcon, ArrowLeftIcon } from '@forge/ui'; 

export type Project = {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  hostUrl: string;
  githubUrl: string;
};

type ProjectsProps = {
  projects: Project[];
};

export default function Projects({ projects }: ProjectsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevProject = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? projects.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const nextProject = () => {
    const isLastSlide = currentIndex === projects.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  if (!projects || projects.length === 0) {
    return null;
  }
  
  return (
    <section className="w-full max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">My Projects</h2>
      
      <div className="relative">
        <div className="overflow-hidden rounded-xl shadow-2xl">
          <div
            className="flex transition-transform ease-in-out duration-500"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {projects.map((project) => (
              <div key={project.id} className="w-full flex-shrink-0 bg-white">
                <img 
                  src={project.imageUrl} 
                  alt={project.title} 
                  className="w-full h-64 object-contain bg-white"
                />
                <div className="p-8">
                  <div className="flex justify-between items-center mb-4">
                    <a 
                      href={project.hostUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {project.title}
                    </a>
                    <a 
                      href={project.githubUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      aria-label={`${project.title} GitHub Repository`}
                      className="text-gray-600 hover:text-black transition-colors"
                    >
                      <GitHubLogoIcon className="w-7 h-7" />
                    </a>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{project.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <button
          onClick={prevProject}
          aria-label="Previous Project"
          className="absolute top-1/2 -left-4 md:-left-12 transform -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-2 transition"
        >
          <ArrowLeftIcon className="w-6 h-6 text-gray-800" />
        </button>
        
        <button
          onClick={nextProject}
          aria-label="Next Project"
          className="absolute top-1/2 -right-4 md:-right-12 transform -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-2 transition"
        >
          <ArrowRightIcon className="w-6 h-6 text-gray-800" />
        </button>
      </div>
    </section>
  );
}