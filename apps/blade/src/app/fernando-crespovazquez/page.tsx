
import React from 'react';
import { LinkedInLogoIcon, GitHubLogoIcon, FileIcon } from '@forge/ui'; 
import Projects from './_components/projects';
import type { Project } from './_components/projects';
import FlyingTK from './_components/FlyingTK';

const projects: Project[] = [
  {
    id: 1,
    title: 'DigiConvo',
    description: 'Made during GeminiKnights Hackathon as a way for users to simulate difficult conversations in real time.',
    imageUrl: '/digiConvo.png',
    hostUrl: 'https://digiconvo.vercel.app/',
    githubUrl: 'https://github.com/crespofer/digiconvo',
  },
  {
    id: 2,
    title: 'Kestrel Autonomous Drone',
    description: 'Implementing detection and tracking of PEV riders in a robotic system on the machine learning team.',
    imageUrl: '/drone.png',
    hostUrl: 'https://kestrel-ucf.vercel.app/',
    githubUrl: 'https://github.com/Autonomous-droneProject/Kestrel',
  },
  {
    id: 3,
    title: 'Public Notes',
    description: 'Notes sharing application for university courses with a focus on various cloud services',
    imageUrl: '/publicNotes.png',
    hostUrl: 'https://public-notes-six.vercel.app/',
    githubUrl: 'https://github.com/crespofer/Public-Notes',
  },
  {
    id: 4,
    title: 'Calc Visualizer',
    description: 'Made during Project Launch to help university students visualize difficult Calculus 1 topics through interaction',
    imageUrl: '/calc-logo-connect-sh.svg',
    hostUrl: 'https://calcvisualizer.speedrunyourknowledge.com/',
    githubUrl: 'https://github.com/Speedrunyourknowledge/calc-visualizer',
  }
];

export default function FernandoCrespoVazquez() {
  
  return (
    <main className="min-h-screen w-full bg-blue-100 py-12 px-4 flex flex-col justify-center items-center">
        <FlyingTK />
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">Hey, I'm Fernando Crespo Vazquez</h1>
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
        <p className="mt-8 max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed">
            I'm a third year computer science student with a passion for learning more about the field of computer science. 
            Most of my work so far has been in web dev but have recently taken an interest in hardware and lower level programming.
            In my free time I enjoy all types of sports and enjoy talking about them, especially upcoming UFC fights and F1 Races!
        </p>
      </div>
      
      <Projects projects={projects}/>
    </main>
  );
}