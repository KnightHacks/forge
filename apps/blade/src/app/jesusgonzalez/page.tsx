import React from 'react';
import CustomHero from "./components/CustomHero";
import { InteractiveVectorField } from './components/VectorField';
import ProjectCard from './components/ProjectCard';
import type { Project } from './components/ProjectCard';

const LandingPage = () => {
  const projects: Project[] = [
    { title: 'PathFinder', href: 'https://github.com/jesusthecreator017/ShellHacks2025', desc: 'Chrome extension that turns natural language questions into step-by-step navigation guides. Uses Google ADK and Gemini 2.5 Flash to scan websites and highlight exactly where to click making web browsing accessible for everyone.', stack: ['Python', 'JS', 'HTML', 'CSS', 'Google ADK'] },
    { title: 'DronePath', href: 'https://github.com/jesusthecreator017/knighthacks2025', desc: 'Drone route optimization tool for power line inspection. Uses Google OR-Tools and graph algorithms to compute efficient multi-drone flight paths under real-world constraints like battery life and airspace boundaries, with interactive Plotly visualizations.', stack: ['Python', 'NumPy', 'OR-Tools', 'Shapely', 'Plotly'] },
    { title: 'Physics Engine', href: 'https://github.com/jesusthecreator017/CustomPhysicsEngine ', desc: "2D particle physics simulation engine built in C with Raylib. Models gravitational forces and particle interactions with cross-platform support and modular architecture.", stack: ['C', 'Raylib', 'Make'] },
    { title: "Issue Tracker", href: 'https://github.com/jesusthecreator017/issue-tracker', desc: "Full-stack issue tracker built with Next.js 16, TypeScript, and Prisma. Features issue CRUD, status tracking, user assignment, dashboard analytics with Recharts, and OAuth authentication via BetterAuth.", stack: ['TS', 'React', 'Next.js', 'Tailwind', 'Radix UI', 'MariaDB', 'Prisma'] }
  ]

  return (
    <div>
      <CustomHero />
      <div className="px-8 max-w-5xl mx-auto -mt-12">
        <InteractiveVectorField
            height={200}
            step={0.5}
            bounds={{ xMin: -5, xMax: 5, yMin: -2, yMax: 2 }}
            arrowScale={18}
            color="#a78bfa"
        />
      </div>
      <div className="px-8 max-w-5xl mx-auto grid grid-cols-2 gap-6 mt-8">
        {projects.map((project, index) => (
          <ProjectCard key={index} title={project.title} href={project.href} desc={project.desc} stack={project.stack} />
        ))}
      </div>
    </div>
  );
}

export default LandingPage;
