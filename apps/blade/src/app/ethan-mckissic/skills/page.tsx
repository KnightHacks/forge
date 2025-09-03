import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SkillsPage() {
  const languages = [
    "TypeScript",
    "JavaScript",
    "HTML/CSS",
    "C#",
    "C",
    "Python",
    "Java",
    "SQL",
    "Bash",
  ];

  const frameworks = [
    "React",
    "Next.js",
    "Node.js",
    "Express.js",
    "ASP.NET",
    "Blazor",
    "Flask",
    "Matplotlib",
    "TailwindCSS",
    "Framer Motion",
  ];

  const tools = [
    "Git",
    "GitHub",
    "Figma",
    "Vite",
    "MongoDB",
    "MySQL",
    "CosmosDB",
    "Docker",
    "Kubernetes",
    "Terraform",
    "Linux",
    "Microsoft Azure",
    "Postman",
  ];

  const concepts = [
    "Full-Stack Development",
    "UX/UI Design",
    "Cloud Computing",
    "RESTful APIs",
    "Object-Oriented Programming (OOP)",
    "Data Structures & Algorithms",
    "Secure Software Design",
    "Agile/Scrum",
  ];

  return (
    <main className="relative min-h-screen">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center blur-lg"
        style={{ backgroundImage: "url('/blue_road.jpg')" }}
      />
      <div className="absolute inset-0 -z-10 bg-slate-900/50" />

      <Link
        href="/ethan-mckissic"
        className="absolute top-20 left-20 text-white flex items-center gap-4 hover:opacity-80 z-10"
      >
        <ArrowLeft className="w-10 h-10" />
      </Link>

      {/* Main */}
      <div className="flex flex-col items-center justify-center pt-20 pb-20 animate-fade-in">
        <h1 className="text-4xl md:text-6xl mb-12 focus:outline-none focus:ring-2 focus:ring-white/40 rounded italic drop-shadow-lg">
          skills
        </h1>

        <Section title="Languages" items={languages} />

        <Section title="Frameworks / Libraries" items={frameworks} />

        <Section title="Tools / Platforms" items={tools} />

        <Section title="Concepts" items={concepts} />
      </div>
    </main>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="max-w-5xl w-full px-4 mb-12">
      <h2 className="text-2xl md:text-3xl font-medium text-white tracking-wide italic text-center mb-6">
        {title}
      </h2>
      <div className="flex flex-wrap justify-center gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-sm md:text-base border border-white/20 hover:bg-white/20 transition"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
