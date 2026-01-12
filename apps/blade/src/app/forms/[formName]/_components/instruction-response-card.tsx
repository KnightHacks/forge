"use client";

import type { z } from "zod";
import Image from "next/image";

import type { InstructionValidator } from "@forge/consts/knight-hacks";
import { Card } from "@forge/ui/card";

type FormInstruction = z.infer<typeof InstructionValidator>;

interface InstructionResponseCardProps {
  instruction: FormInstruction;
}

export function InstructionResponseCard({
  instruction,
}: InstructionResponseCardProps) {
  return (
    <Card className="relative mt-12 flex flex-col gap-1 bg-card p-6 text-card-foreground transition-all">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <h3 className="text-xl font-bold">{instruction.title}</h3>
        </div>
      </div>

      {instruction.content && (
        <div className="mb-4 whitespace-pre-wrap pt-2 text-sm text-muted-foreground">
          {instruction.content}
        </div>
      )}

      {instruction.imageUrl && (
        <div className="relative h-64 w-full overflow-hidden rounded-md">
          <Image
            src={instruction.imageUrl}
            alt={instruction.title}
            fill
            className="object-contain"
          />
        </div>
      )}

      {instruction.videoUrl && (
        <div className="overflow-hidden rounded-md">
          <video src={instruction.videoUrl} controls className="w-full">
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </Card>
  );
}
