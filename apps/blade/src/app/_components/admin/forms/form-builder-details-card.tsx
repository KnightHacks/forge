"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";

import type { BuilderInitial } from "./form-builder-types";
import type { MediaInstruction } from "./form-definition-draft";
import { toSlug } from "./form-builder-formatting";

export function FormBuilderDetailsCard({
  description,
  initial,
  instructions,
  mediaInstructions,
  name,
  onUploadInstruction,
  readOnly,
  setDescription,
  setInstructions,
  setMediaInstructions,
  setName,
  setSlug,
  slug,
}: {
  description: string;
  initial?: BuilderInitial;
  instructions: string;
  mediaInstructions: MediaInstruction[];
  name: string;
  onUploadInstruction: (file: File, type: "image" | "video") => Promise<void>;
  readOnly: boolean;
  setDescription: Dispatch<SetStateAction<string>>;
  setInstructions: Dispatch<SetStateAction<string>>;
  setMediaInstructions: Dispatch<SetStateAction<MediaInstruction[]>>;
  setName: Dispatch<SetStateAction<string>>;
  setSlug: Dispatch<SetStateAction<string>>;
  slug: string;
}) {
  return (
    <Card className="border-white/10 bg-card/95 shadow-xl shadow-black/20">
      <CardHeader>
        <CardTitle>Form details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="form-name">Title</Label>
          <Input
            disabled={readOnly}
            id="form-name"
            className="h-11"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!initial) setSlug(toSlug(event.target.value));
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="form-slug">Stable link slug</Label>
          <Input
            id="form-slug"
            className="h-11"
            disabled={readOnly || Boolean(initial && initial.state !== "draft")}
            value={slug}
            onChange={(event) => setSlug(toSlug(event.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="form-description">Description</Label>
          <Textarea
            disabled={readOnly}
            id="form-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="form-instructions">Instructions</Label>
          <Textarea
            disabled={readOnly}
            id="form-instructions"
            className="min-h-28"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
        </div>
        {initial && (
          <div className="grid gap-3 rounded-md border border-white/10 bg-background/60 p-3">
            <Label>Instruction media</Label>
            {!readOnly && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="h-11"
                  aria-label="Add instruction image"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onUploadInstruction(file, "image");
                  }}
                />
                <Input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  className="h-11"
                  aria-label="Add instruction video"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onUploadInstruction(file, "video");
                  }}
                />
              </div>
            )}
            {mediaInstructions.map((media) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-card/50 p-2 text-sm"
                key={media.id}
              >
                <span className="truncate">
                  {media.type}: {media.alt}
                </span>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setMediaInstructions((current) =>
                        current.filter(({ id }) => id !== media.id),
                      )
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
