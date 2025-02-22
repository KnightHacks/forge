"use client"; // client component because .tsx moment

import { Button } from "@forge/ui/button";
import Link from "next/link";
import { ReactNode } from "react"; 

//Link changes so that it opens a new tab so that the sound isnt useless LOL

interface InteractiveButtonProps {
  href: string;
  children: ReactNode;
  soundFile: string;
}

export default function InteractiveButton({ href, children, soundFile }: InteractiveButtonProps) {
  const playSound = () => {
    const audio = new Audio(soundFile);
    audio.play().catch(error => console.error("Error playing sound:", error));
  };

  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className="border-0 border-border"
      onClick={playSound}
    >
      <Link href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </Link>
    </Button>
  );
}