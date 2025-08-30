
import React from 'react';
import { LinkedInLogoIcon, GitHubLogoIcon, FileIcon } from '@forge/ui'; 
import Projects from './_components/projects';
import type { Project } from './_components/projects';

const projects: Project[] = [
  {
    id: 1,
    title: 'DigiConvo',
    description: 'Therapist App',
    imageUrl: '/digiConvo.ico',
    hostUrl: '',
    githubUrl: '',
  },
  {
    id: 2,
    title: 'Kestrel Autonomous Drone',
    description: 'Machine learning team autonomous drone',
    imageUrl: '/digiConvo.ico',
    hostUrl: '',
    githubUrl: '',
  },
  {
    id: 3,
    title: 'Public Notes',
    description: 'Notes sharing app',
    imageUrl: '/digiConvo.ico',
    hostUrl: '',
    githubUrl: '',
  },
  {
    id: 4,
    title: 'Calc Visualizer',
    description: 'Visualize calculus 1 topics',
    imageUrl: '/digiConvo.ico',
    hostUrl: '',
    githubUrl: '',
  }
];

export default function FernandoCrespoVazquez() {
  
  return (
    <main className="min-h-screen w-full bg-blue-100 py-12 px-4 flex flex-col justify-center items-center">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">Hey, I'm Fernando</h1>
        <div className="flex justify-center gap-6">
          <a
            href="https://www.linkedin.com/in/fernando-crespo-vazquez/"
            target="_blank"
            className="text-[#0077b5] hover:scale-110 transition-transform"
          >
            <LinkedInLogoIcon className="w-10 h-10" /> 
          </a>
          <a
            href="https://github.com/crespofer"
            target="_blank"
            className="text-black hover:scale-110 transition-transform"
          >
            <GitHubLogoIcon className="w-10 h-10" />
          </a>
          <a
          href="/resume.pdf"
          target="_blank"
          className="text-gray-700 hover:scale-110 transition-transform"
          >
            <FileIcon className="w-10 h-10"/>
          </a>
        </div>
      </div>
      
      <Projects projects={projects}/>
    </main>
  );
}