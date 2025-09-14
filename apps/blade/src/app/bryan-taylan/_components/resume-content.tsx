"use client";

import { FileText } from "lucide-react";

import { ExternalLinkIcon } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Card, CardHeader, CardTitle } from "@forge/ui/card";
import { Separator } from "@forge/ui/separator";

import { AboutSection } from "./about-section";
import { AnimatedSection } from "./animated-section";
import { ContactSection } from "./contact-section";
import { ExperienceSection } from "./experience-section";
import { ProjectsSection } from "./projects-section";
import { SkillsSection } from "./skills-section";
import { WhyKnightHacksSection } from "./why-knighthacks-section";

export function ResumeContent() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <AnimatedSection delay={0}>
        <Card>
          <CardHeader className="text-center">
            <div className="mb-6">
              <img
                src="/bryan-taylan-pfp.png"
                alt="Bryan Taylan"
                className="mx-auto h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg"
              />
            </div>
            <CardTitle className="text-3xl font-bold">Bryan Taylan</CardTitle>
            <p className="text-xl text-muted-foreground">
              Computer Engineering Student
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              <div className="text-sm text-muted-foreground">Orlando, FL</div>
              <div className="text-sm text-muted-foreground">
                (561) 704-4970
              </div>
              <div className="text-sm text-muted-foreground">
                bryanefetaylan@gmail.com
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://github.com/BryanTaylan"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="mr-2 h-4 w-4" />
                  GitHub
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://linkedin.com/in/bryan-taylan"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="mr-2 h-4 w-4" />
                  LinkedIn
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://bryan-taylan-portfolio.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="mr-2 h-4 w-4" />
                  Portfolio
                </a>
              </Button>
            </div>
            <div className="mt-3 flex justify-center">
              <Button
                variant="primary"
                size="sm"
                className="font-semibold"
                asChild
              >
                <a
                  href="/Bryan_Taylan_Resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Resume PDF
                </a>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </AnimatedSection>

      <AnimatedSection delay={50}>
        <Separator />
      </AnimatedSection>

      {/* About Section */}
      <AnimatedSection delay={100}>
        <AboutSection />
      </AnimatedSection>

      <AnimatedSection delay={50}>
        <Separator />
      </AnimatedSection>

      {/* Why KnightHacks Section */}
      <AnimatedSection delay={150}>
        <WhyKnightHacksSection />
      </AnimatedSection>

      <AnimatedSection delay={50}>
        <Separator />
      </AnimatedSection>

      {/* Experience Section */}
      <AnimatedSection delay={200}>
        <ExperienceSection />
      </AnimatedSection>

      <AnimatedSection delay={50}>
        <Separator />
      </AnimatedSection>

      {/* Projects Section */}
      <AnimatedSection delay={250}>
        <ProjectsSection />
      </AnimatedSection>

      <AnimatedSection delay={50}>
        <Separator />
      </AnimatedSection>

      {/* Skills Section */}
      <AnimatedSection delay={300}>
        <SkillsSection />
      </AnimatedSection>

      <AnimatedSection delay={50}>
        <Separator />
      </AnimatedSection>

      {/* Contact Section */}
      <AnimatedSection delay={350}>
        <ContactSection />
      </AnimatedSection>
    </div>
  );
}
