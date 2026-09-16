import type { Metadata } from "next";
import { Github, Linkedin } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

export const metadata: Metadata = {
  title: "Raul Rodriguez | KnightHacks Dev Team Application",
};

export default function RaulPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-4xl font-semibold text-foreground">Raul Rodriguez</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        CS Student at UCF. I build things that solve annoying problems.
      </p>
      <Card className="mt-8 max-w-xl">
        <CardHeader>
          <CardTitle className="mb-4 text-center">Knight Information</CardTitle>
          <CardDescription>CS Major</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Region</span>
            <span className="text-foreground">Orlando, FL</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Party</span>
            <span className="text-foreground">
              Java, Python, Typescript, C, HTML/CSS/JS
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Objective</span>
            <span className="text-foreground">Knight Hacks Dev Team</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Battle Type</span>
            <span className="text-foreground">
              AI/ML, Embedded Systems, Robotics
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Adventure Started</span>
            <span className="text-foreground">Valencia 2024 → UCF 2026</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Projects</span>
            <span className="text-foreground">2 Caught</span>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <a
            href="https://github.com/Raul001R"
            target="_blank"
            rel="noreferrer"
          >
            <Github className="size-4" />
            GitHub
          </a>
        </Button>
        <Button asChild variant="outline">
          <a
            href="https://www.linkedin.com/in/raul-rodriguez-cs"
            target="_blank"
            rel="noreferrer"
          >
            <Linkedin className="size-4" />
            LinkedIn
          </a>
        </Button>
      </div>
    </main>
  );
}
