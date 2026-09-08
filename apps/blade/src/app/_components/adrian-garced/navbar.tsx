import {
  GithubIcon,
  CodebergIcon
} from "~/app/adrian-garced/icons"

import {
  FileText,
  Github,
  Mail,
  ExternalLink,
  AlertTriangle
} from "lucide-react";

import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@forge/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

const NAVICONS = [
  {
    tooltip: "Github",
    icon: GithubIcon,
    url: "https://github.com/pinkytoefoo"
  },
  {
    tooltip: "Codeberg",
    icon: CodebergIcon,
    url: "https://codeberg.org/pinkytoefoo"
  },
  {
    tooltip: "Resume",
    icon: FileText,
    url: "resume.pdf"
  },
  {
    tooltip: "Email",
    icon: Mail,
    url: "mailto://agadrian1331@gmail.com"
  }
] as const;

export default function Navbar() {
  return (
    <nav className="w-full border-b sticky top-0 z-40 backdrop-blur" style={{ backgroundColor: 'rgba(var(--background), 0.8)' }}>
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <a href="#" className="font-semibold">
          adrian-g
        </a>

        <div className="flex items-center gap-8">
          {NAVICONS.map((icons) => (
            <Tooltip key={icons.tooltip}>
              <TooltipTrigger asChild>
                <a href={icons.url} className="flex items-center gap-2" target="_blank" rel="noopener noreferrer">
                  <icons.icon className="size-6" />
                </a>
              </TooltipTrigger>
              <TooltipContent className="bg-accent">
                <p>{icons.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </nav>
  );
}