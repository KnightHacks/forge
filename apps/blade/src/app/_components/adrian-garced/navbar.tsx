import {
  GithubIcon,
  CodebergIcon
} from "~/app/adrian-garced/icons"

import {
  Github,
  FileUser,
  FileUserIcon
} from "lucide-react"

import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@forge/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

export default function Navbar() {
  return (
    <nav className="w-full border-b sticky top-0 z-40 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <a href="#" className="font-semibold">
          adrian-g
        </a>

        <div className="flex items-center gap-8">
          <Tooltip>
            <TooltipTrigger>
              <TooltipContent>
                <p>Github</p>
              </TooltipContent>
              <a href="https://github.com/pinkytoefoo" className="flex items-center gap-2">
                <GithubIcon className="size-8" />
                {/* GitHub */}
              </a>
            </TooltipTrigger>
          </Tooltip>

          <Tooltip >
            <TooltipTrigger>
              <TooltipContent>
                <p>Codeberg</p>
              </TooltipContent>
              <a href="https://codeberg.com/pinkytoefoo" className="flex items-center gap-2">
                <CodebergIcon className="size-8" />
              </a>
            </TooltipTrigger>
          </Tooltip>

          <Tooltip >
            <TooltipTrigger>
              <TooltipContent>
                <p>Resume</p>
              </TooltipContent>
              {/* TODO: add resume.pdf to public */}
              <a href="Resume.pdf" className="flex items-center gap-2">
                <FileUserIcon className="size-8" />
              </a>
            </TooltipTrigger>
          </Tooltip>
        </div>
      </div>
    </nav>
  );
}