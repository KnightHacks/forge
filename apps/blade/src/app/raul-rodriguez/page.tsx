import type { Metadata } from "next";
import localFont from "next/font/local";
import Image from "next/image";
import {
  Briefcase,
  ChevronDown,
  Github,
  Linkedin,
  MessageCircle,
} from "lucide-react";

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
export const metadata: Metadata = {
  title: "Raul Rodriguez | KnightHacks Dev Team Application",
};

export default function RaulPage() {
  return (
    <main
      className={`${pixel.className} mx-auto min-h-screen max-w-[1920px] scroll-smooth bg-background p-8`}
    >
      <section className="relative isolate -mx-8 -mt-8 overflow-hidden px-8 pt-8">
        <Image
          src="/forest.png"
          alt=""
          fill
          priority
          className="-z-10 object-cover [image-rendering:pixelated]"
        />
        <h1 className="text-4xl font-semibold text-primary">Trainer Card</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">Raul Rodriguez</p>
        <div className="mt-8 flex min-h-[70vh] flex-col items-center gap-6 md:flex-row md:justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="mb-4 text-center text-primary">
                Knight Information
              </CardTitle>
              <CardDescription>ID No. RR-2028</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Region</span>
                <span className="text-foreground">Orlando, FL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Party</span>
                <span className="text-foreground">
                  Java, Python, TypeScript, C, HTML/CSS/JS
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
                <span className="text-foreground">
                  Valencia 2024 → UCF 2026
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Projects</span>
                <span className="text-foreground">2 caught</span>
              </div>
            </CardContent>
          </Card>
          <Image
            src="/trainer.png"
            alt="Pixel art trainer sprite of Raul Rodriguez"
            width={140}
            height={200}
            className="h-auto w-56 [image-rendering:pixelated]"
          />
        </div>
        <div className="mt-6 flex flex-wrap justify-evenly gap-3">
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
          <Button asChild variant="outline">
            <a
              href="https://discord.com/users/1511029202223239228"
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4" />
              Discord
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href="https://drive.google.com/file/d/1YV_9Wu4uZDDWrfn67H6WLd7jhcqFIQVX/view?usp=drive_link"
              target="_blank"
              rel="noreferrer"
            >
              <Briefcase className="size-4" />
              Resume
            </a>
          </Button>
        </div>
        <div className="mt-8 flex justify-center">
          <Button asChild variant="ghost">
            <a href="#pokedex">
              <ChevronDown className="size-4" />
              Projects
            </a>
          </Button>
        </div>
      </section>
      <Card id="pokedex" className="mt-8 font-sans">
        <CardHeader>
          <CardTitle className="mb-4 text-center">Pokedex</CardTitle>
          <CardDescription>Projects Collected</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-medium text-foreground">Car Price Predictor</h3>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Random forest regressor trained on a Kaggle Craigslist used-car
              dataset. The first run returned a negative R² with mean absolute
              error in the millions, which pointed at the data rather than the
              model — $1 listings and million-dollar Hondas. Cleaning those out
              brought R² to 0.67 and MAE to about $5,500.
            </p>
            <Image
              src="/cpp_result.png"
              alt="Used car price predictor web app with year, make, mileage and model inputs"
              width={800}
              height={450}
              className="mt-4 aspect-video w-full rounded-md border border-white/10 object-cover"
            />
          </div>
          <div>
            <h3 className="font-medium text-foreground">
              Parking Space Detector
            </h3>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              YOLOv8 and OpenCV pipeline that tracks parking spot occupancy in
              real time. Spaces are four-point polygons to handle the camera's
              angle, and a spot flips to occupied when its centroid lands inside
              a detected car's box.
            </p>
            <Image
              src="/parking_detector.png"
              alt="Parking lot with cars in blue bounding boxes and spaces outlined green for open, red for occupied"
              width={800}
              height={450}
              className="mt-4 aspect-video w-full rounded-md border border-white/10 object-cover"
            />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
