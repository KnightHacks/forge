"use client"

import { Button } from "@forge/ui/button"
import { Card, CardContent } from "@forge/ui/card"
import { Download, Linkedin, Mail, FileText } from "lucide-react"
import InteractiveBackground from "./_components/interactiveBackground"
import ProjectSection from "./_components/projectSection"

interface ProjectType {
  type: "webdev" | "aiml" | "other"
  name: string
  description?: string
  images?: string[]
}

const projects: ProjectType[] = [
	{
		type: "aiml",
		name: "Hand Gesture Recognition Interface",
		description: "Computer vision system enabling hands-free computer control through real-time gesture recognition",
		images: [],
	},
  {
    type: "aiml",
    name: "Pokémon Recognition Model",
    description:
      "Computer vision model using transfer learning and convolutional neural networks to accurately identify Pokémon species",
    images: [],
  },
  {
    type: "aiml",
    name: "Chess AI Engine",
    description: "Strategic chess AI using minimax algorithm with alpha-beta pruning for optimal move calculation",
    images: [],
  },
  {
    type: "aiml",
    name: "Flappy Bird Neural Network AI",
    description: "Self-learning AI using genetic algorithms and neural networks to master the Flappy Bird game",
    images: [],
  },
  {
    type: "aiml",
    name: "Google Dino Game Deep Q-Learning AI",
    description: "Advanced AI agent using deep Q-learning to achieve high scores in the Chrome dinosaur game",
    images: [],
  },
  {
    type: "aiml",
    name: "Tetris AI",
    description:
      "Implemented genetic algorithms with neural networks to make an AI play tetries, cleared (I think) 30000+ lines",
    images: [],
  },
  {
    type: "webdev",
    name: "Anonymous Classroom Q&A Platform",
    description:
      "Full-stack application for anxious students with anonymous posting, authentication, teacher moderation, and room management using NextJS and TypeScript",
    images: [],
  },
  {
    type: "webdev",
    name: "WhatsApp Social Credit Bot",
    description:
      "Custom WhatsApp bot using REST APIs with automated message parsing, social credit system, and database storage for group management and engagement tracking",
    images: [],
  },
  {
    type: "webdev",
    name: "Custom Invoice Generator",
    description:
      "Professional invoicing system with custom templating engine, PDF generation, and client management using NextJS",
    images: [],
  },
  {
    type: "webdev",
    name: "Study Tracker & Auto-Reminder System",
    description:
      "Real-time monitoring system tracking study habits with automated reminders using NextJS and WebSockets",
    images: [],
  },
  {
    type: "webdev",
    name: "Multiplayer r/place Clone",
    description:
      "Real-time collaborative pixel art canvas with authentication and live updates using SocketIO and ReactJS",
    images: [],
  },
  {
    type: "webdev",
    name: "Online Codenames Game",
    description: "Multiplayer word-guessing game with real-time communication and room management using WebSockets",
    images: [],
  },
  {
    type: "webdev",
    name: "Custom Chess Engine",
    description:
      "Complete chess implementation with move validation, game logic, and multiplayer functionality for web browsers",
    images: [],
  },

  {
    type: "other",
    name: "TTF Font Renderer",
    description:
      "Low-level font rendering engine in C, parsing and processing raw TTF file byte data for custom text display",
    images: [],
  },
  {
    type: "other",
    name: "You, Again? - GMTK Game Jam",
    description: "Puzzle platformer where players collaborate with their clones, developed in Unity with C#",
    images: [],
  },
  {
    type: "other",
    name: "Shader-Based Slime Simulation",
    description:
      "Advanced GPU-accelerated slime behavior simulation exploring emergent patterns and network optimization",
    images: [],
  },
  {
    type: "other",
    name: "Boids Flocking Simulation",
    description: "Realistic bird and fish flocking behavior simulation using emergent AI and physics-based movement",
    images: [],
  },
  {
    type: "other",
    name: "Real-time Fluid Dynamics",
    description: "Physics-based fluid simulation with realistic water behavior and particle interactions",
    images: [],
  },
  {
    type: "other",
    name: "Image to Desmos Graph Converter",
    description:
      "Mathematical algorithm converting digital images into plottable equations for Desmos graphing calculator",
    images: [],
  },
]


export default function HomePage() {
  const groupedProjects = {
    webdev: projects.filter((p) => p.type === "webdev"),
    aiml: projects.filter((p) => p.type === "aiml"),
    other: projects.filter((p) => p.type === "other"),
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = "/DhruvGoel_Resume.pdf" 
    link.download = "DhruvGoel_Resume.pdf" 
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-background dark">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <InteractiveBackground />
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 text-balance">Dhruv Goel</h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 text-balance">
            Full-Stack Developer, AI (in non art places) enthusiast & a little bit of everything else
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto text-pretty">
            Small section about nothing because page looked weird without it blah blah blah (Try moving the cursor in
            the background btw! First person to put all the particles together gets a cookie)
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" onClick={() => scrollToSection("projects")} className="text-lg px-8">
              View My Work
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollToSection("about")} className="text-lg px-8">
              About Me
            </Button>
            <Button size="lg" variant="secondary" onClick={() => scrollToSection("resume")} className="text-lg px-8">
              <FileText className="w-4 h-4 mr-2" />
              Resume
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-6 text-balance">About Me</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex gap-4 pb-6 justify-center">
              <Button variant="outline" size="sm" asChild className="text-sm bg-transparent">
                <a href="https://www.linkedin.com/in/dhruv-goel-031868322/" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:dh814557@ucf.edu">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </a>
              </Button>
            </div>
            <p className="text-lg text-muted-foreground text-pretty">
              Computer Science student at UCF's Burnett Honors College with a passion for solving complex technical
              problems through code. Currently conducting research in computational biology and AI while building
              full-stack web applications for real-world clients. I enjoy the full spectrum of development—from machine
              learning and GPU programming to creating scalable platforms that serve thousands of users.
            </p>
          </div>
        </div>
      </section>

      {/* Resume Section */}
      <section id="resume" className="py-20 px-4 bg-muted/30">
        <div className="w-fit mx-auto text-center flex flex-col">
          <h2 className="text-4xl font-bold mb-8 text-balance">Resume</h2>
          <p className="text-lg text-muted-foreground mb-12 text-pretty">
            I know I should convert the image to svg or webp before I serve it. I don't want to. It's going to stay a
            png.
          </p>

          <Button size="lg" onClick={handleDownload} className="text-lg w-fit self-center px-4">
            <Download />
            <p className="mx-2"> Download The PDF </p>
          </Button>
          <Card className="my-8 overflow-hidden w-fit self-center">
            <CardContent className="p-0">
              <img src="/DhruvGoel_Resume.png" alt="Resume" className="w-full h-auto max-h-[800px] object-contain" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Other Projects</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty">
						I swear I like some of these more than the projects on my resume
            </p>
            <div className="w-24 h-1 bg-primary mx-auto mt-6 rounded-full"></div>
          </div>

          <div className="space-y-20">
            {/* Web Development Section */}
						<ProjectSection projects={groupedProjects.webdev} name = "Web Development"/>
						<ProjectSection projects={groupedProjects.aiml} name="Artificial Intelligence and Machine Learning"/>
						<ProjectSection projects={groupedProjects.other} name="Other/Simulations/Game Dev/Systems"/>
          </div>
        </div>
      </section>
    </div>
  )
}
