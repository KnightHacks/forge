import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProjectCoverflow from "../_components/projectslider";

interface Project {
  title: string;
  description: string;
  imageSrc: string;
  url?: string;
};

export default function ProjectsPage() {
  const projects: Project[] = [
  {
    title: "Cloud Vault",
    description:
      "2nd place at ShellHacks 2024 for Best use of Chainguard. A secure web app that lets users upload files, storing them in an isolated Docker container using Chainguard’s Wolfi OS to ensure portability and extra protection from vulnerabilities.",
    imageSrc: "/cloudvault.png",
    url: "https://devpost.com/software/cloud-vault", 
  },
  {
    title: "N.O.V.A.",
    description:
      "Won Best Design at HackUSF 2025. Neural Optimization with Visual Analysis — tracks on-screen attention in real time using OpenCV and uses Matplotlib to visualize the results.",
    imageSrc: "/nova.png",
    url: "https://devpost.com/software/n-o-v-a-ai",
  },
  {
    title: "Binary Fallout",
    description:
      "A post-apocalyptic gamified quiz app where you scavenge for cards and test your knowledge to rebuild reality. Powered by Google Gemini.",
    imageSrc: "/binaryfallout.png",
    url: "https://devpost.com/software/binary-fallout",
  },
  {
    title: "DressMeUp",
    description:
      "An outfit planner and organizer with an intergrated calendar and weather dashboard. Also contains a mobile version using Flutter.",
    imageSrc: "/GreenLogo.png",
    url: "https://github.com/Group23-COP4331/Dress-Me-Up",
  },
];

  return (
    <main className="relative min-h-screen">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-no-repeat blur-md"
        style={{ backgroundImage: "url('/blue_road.jpg')" }}
      />
      <div className="absolute inset-0 -z-10 bg-slate-900/50" />

      <Link
        href="/ethan-mckissic"
        className="absolute top-20 left-20 z-10 text-white flex items-center gap-4 hover:opacity-80"
      >
        <ArrowLeft className="w-10 h-10" />
      </Link>

      <div className="flex flex-col items-center justify-center pt-20 animate-fade-in">
        <h1 className="text-4xl md:text-6xl mb-8 focus:outline-none focus:ring-2 focus:ring-white/40 rounded italic drop-shadow-lg">
          projects
        </h1>

        <div className="max-w-4xl w-full px-4">
          <ProjectCoverflow projects={projects} />
        </div>
      </div>
    </main>
  );
}
