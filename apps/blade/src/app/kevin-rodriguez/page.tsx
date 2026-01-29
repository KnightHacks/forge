import type { Metadata } from "next";

import "./_styles/animations.css";

import { HeroSection } from "./_components/hero-section";
import { AboutSection } from "./_components/about-section";
import { SkillsSection } from "./_components/skills-section";
import { ProjectsSection } from "./_components/projects-section";

export const metadata: Metadata = {
  title: "Kevin Rodriguez | Dev Team Application",
  description: "Knight Hacks Dev Team Application - Kevin Rodriguez",
};

export default function KevinRodriguezPage() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <AboutSection />
      <SkillsSection />
      <ProjectsSection />
    </main>
  );
}
