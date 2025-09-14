import { ExternalLinkIcon } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

interface ProjectItem {
  title: string;
  description: string;
  technologies: string[];
  githubUrl?: string;
}

const projectsData: ProjectItem[] = [
  {
    title: "Shoperize",
    description:
      "AI-powered Shopify app that automates product background replacement using GPT-4 Vision and DALL-E 3, reducing editing time from hours to minutes with custom prompt generation.",
    technologies: [
      "Remix",
      "React",
      "Python",
      "Flask",
      "OpenAI API",
      "Shopify API",
    ],
    githubUrl: "https://github.com/BryanTaylan/shoperize",
  },
  {
    title: "Venue View",
    description:
      "Full-stack concert preview app with interactive seat maps and Ticketmaster integration. Features user authentication, real-time event data, and dynamic seating visualization.",
    technologies: [
      "React",
      "Flask",
      "TypeScript",
      "Tailwind CSS",
      "SQLite",
      "Ticketmaster API",
    ],
    githubUrl: "https://github.com/BryanTaylan/venue-view",
  },
  {
    title: "Gym Tracker",
    description:
      "Full-stack fitness tracking application with user authentication and workout logging. Built with persistent data storage for exercises, sets, and reps tracking.",
    technologies: ["React", "Node.js", "JavaScript", "Authentication"],
    githubUrl: "https://github.com/BryanTaylan/gym-tracker",
  },
];

export function ProjectsSection() {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Featured Projects</h2>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
        {projectsData.map((project, index) => (
          <Card key={index} className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">{project.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed text-muted-foreground">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {project.technologies.map((tech) => (
                  <Badge key={tech} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
