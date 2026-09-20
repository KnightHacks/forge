"use client";

import type { Ref } from "react";
import { useEffect, useRef, useState } from "react";
import localFont from "next/font/local";
import Image from "next/image";
import {
  Briefcase,
  ChevronDown,
  Github,
  Linkedin,
  MessageCircle,
} from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

const pixel = localFont({
  src: "./pokemon-dppt.woff2",
});

const knightInfo = [
  { label: "Region", value: "Orlando, FL" },
  { label: "Party", value: "Java, Python, TypeScript, C, HTML/CSS/JS" },
  { label: "Current Objective", value: "Knight Hacks Dev Team" },
  { label: "Battle Type", value: "AI/ML, Embedded Systems, Robotics" },
  { label: "Adventure Started", value: "Valencia 2024 → UCF 2026" },
  { label: "Projects", value: "2 caught" },
];

const socialLinks = [
  { label: "GitHub", href: "https://github.com/Raul001R", icon: Github },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/raul-rodriguez-cs",
    icon: Linkedin,
  },
  {
    label: "Discord",
    href: "https://discord.com/users/1511029202223239228",
    icon: MessageCircle,
  },
  {
    label: "Resume",
    href: "https://drive.google.com/file/d/1YV_9Wu4uZDDWrfn67H6WLd7jhcqFIQVX/view?usp=drive_link",
    icon: Briefcase,
  },
];

const projects = [
  {
    title: "Car Price Predictor",
    description:
      "Random forest regressor trained on a Kaggle Craigslist used-car dataset. The first run returned a negative R² with mean absolute error in the millions, which pointed at the data rather than the model — $1 listings and million-dollar Hondas. Cleaning those out brought R² to 0.67 and MAE to about $5,500.",
    image: "/cpp_result.png",
    alt: "Used car price predictor web app with year, make, mileage and model inputs",
    tech: ["Python", "scikit-learn", "pandas", "Streamlit"],
  },
  {
    title: "Parking Space Detector",
    description:
      "YOLOv8 and OpenCV pipeline that tracks parking spot occupancy in real time. Spaces are four-point polygons to handle the camera's angle, and a spot flips to occupied when its centroid lands inside a detected car's box.",
    image: "/parking_detector.png",
    alt: "Parking lot with cars in blue bounding boxes and spaces outlined green for open, red for occupied",
    tech: ["Python", "YOLOv8", "OpenCV", "NumPy"],
  },
];

export default function RaulPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    void videoRef.current?.play().catch(() => setIntroDone(true));

    // A stalled video fires neither `ended` nor `error`, which would leave the
    // page permanently invisible, so reveal it regardless after a ceiling.
    const ceiling = setTimeout(() => setIntroDone(true), 15_000);
    return () => clearTimeout(ceiling);
  }, []);

  const reveal = `transition-opacity duration-700 ${
    introDone ? "opacity-100" : "pointer-events-none opacity-0"
  }`;

  return (
    <main
      className={`${pixel.className} mx-auto min-h-screen max-w-[1920px] scroll-smooth bg-background p-8`}
    >
      <section className="relative isolate -mx-8 -mt-8 overflow-hidden px-8 pt-8">
        <IntroVideo videoRef={videoRef} onFinish={() => setIntroDone(true)} />
        <div className={reveal} aria-hidden={!introDone}>
          <h1 className="text-4xl font-semibold text-primary">Trainer Card</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">Raul Rodriguez</p>
          <div className="mt-8 flex min-h-[70vh] flex-col items-center gap-6 md:flex-row md:justify-evenly">
            <KnightInfoCard />
            <Image
              src="/trainer.png"
              alt="Pixel art trainer sprite of Raul Rodriguez"
              width={140}
              height={200}
              className="h-auto w-[17.5rem] [image-rendering:pixelated]"
            />
          </div>
          <SocialLinks />
          <div className="mt-8 flex justify-center">
            <Button asChild variant="ghost">
              <a href="#pokedex">
                <ChevronDown className="size-4" />
                Projects
              </a>
            </Button>
            <Button asChild variant="ghost">
              <a href="#why">
                <ChevronDown className="size-4" />
                Why KH Dev?
              </a>
            </Button>
          </div>
        </div>
      </section>
      <div className="-mx-8 bg-gradient-to-b from-primary/25 to-transparent px-8">
        <Pokedex />
        <WhyKnightHacks />
      </div>
    </main>
  );
}

function IntroVideo({
  videoRef,
  onFinish,
}: {
  videoRef: Ref<HTMLVideoElement>;
  onFinish: () => void;
}) {
  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      poster="/forest.png"
      onEnded={onFinish}
      onError={onFinish}
      className="absolute inset-0 -z-10 h-full w-full object-cover [image-rendering:pixelated]"
    >
      <source src="/intro.mp4" type="video/mp4" />
    </video>
  );
}

function KnightInfoCard() {
  return (
    <Card className="w-full max-w-[52.5rem]">
      <CardHeader>
        <CardTitle className="mb-4 text-center text-primary">
          Knight Information
        </CardTitle>
        <CardDescription>ID No. RR-2028</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {knightInfo.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-foreground">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SocialLinks() {
  return (
    <div className="mt-6 flex flex-wrap justify-evenly gap-3">
      {socialLinks.map(({ label, href, icon: Icon }) => (
        <Button
          key={label}
          asChild
          size="lg"
          variant="outline"
          className="text-base"
        >
          <a href={href} target="_blank" rel="noreferrer">
            <Icon className="size-5" />
            {label}
          </a>
        </Button>
      ))}
    </div>
  );
}

function Pokedex() {
  return (
    <Card id="pokedex" className="mt-8 font-sans">
      <CardHeader>
        <CardTitle className="mb-4 text-center">Pokedex</CardTitle>
        <CardDescription>Projects Collected</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 md:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project }: { project: (typeof projects)[number] }) {
  return (
    <div className="rounded-md border border-white/10 bg-background/60 p-4">
      <h3 className="font-medium text-foreground">{project.title}</h3>
      <p className="mt-2 text-muted-foreground">{project.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {project.tech.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>
      <Image
        src={project.image}
        alt={project.alt}
        width={800}
        height={450}
        className="mt-4 aspect-video w-full rounded-md border border-white/10 object-cover"
      />
    </div>
  );
}

function WhyKnightHacks() {
  return (
    <section>
      <div className="mt-8 flex flex-col items-center gap-6 md:flex-row md:justify-evenly">
        <Card id="why" className="p-8 font-sans">
          <CardHeader>
            <CardTitle className="mb-4 text-center">
              Why Knight Hacks Dev Team?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="max-w-2xl text-muted-foreground">
              chose to apply for the Knight Hacks Dev Team to build things with
              a team. Most of my projects and classwork have been alone and I'd
              like to change this and learn to work with a team. As a recent
              Valencia transfer, I figured KH Dev Team would be the best place
              to make friends with like-minded people and finally do that. I'd
              also like to widen my knowledge in web development, since I
              haven't gone deep in it, just surface topics. Being surrounded by
              other devs while helping Knight Hacks members with the services
              we'd provide would be amazing.
            </p>
          </CardContent>
        </Card>
        <Image
          src="/knight-hacks-logo.svg"
          alt="Knight hacks logo"
          width={140}
          height={200}
          className="h-auto w-[17.5rem]"
        />
      </div>
    </section>
  );
}
