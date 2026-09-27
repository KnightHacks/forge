"use client";

import type { Dispatch, SetStateAction } from "react";
import { FileImage, FileVideo, Trash2, Upload } from "lucide-react";

import type { FormDefinition } from "@forge/validators";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";
import { FORM_BANNER_UPLOAD_POLICY, uploadAccept } from "@forge/validators";

import type { BuilderInitial } from "./form-builder-types";
import type { MediaInstruction } from "./form-definition-draft";
import { FormBanner } from "~/app/_components/forms/form-banner";
import { InstructionMedia } from "~/app/_components/forms/instruction-media";
import { toSlug } from "./form-builder-formatting";

function FormBannerEditor({
  banner,
  onUpload,
  readOnly,
  setBanner,
}: {
  banner?: FormDefinition["banner"];
  onUpload: (file: File) => Promise<void>;
  readOnly: boolean;
  setBanner: Dispatch<SetStateAction<FormDefinition["banner"] | undefined>>;
}) {
  return (
    <div className="grid min-w-0 gap-3 rounded-md border border-white/10 bg-background/60 p-3">
      <div>
        <Label>Top banner</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Use a wide image. It is cropped to a responsive 4:1 frame.
        </p>
      </div>
      {banner && (
        <div className="overflow-hidden rounded-md border border-white/10">
          <FormBanner {...banner} />
        </div>
      )}
      {banner && (
        <div className="grid gap-2">
          <Label htmlFor="form-banner-alt">Banner alt text</Label>
          <Input
            disabled={readOnly}
            id="form-banner-alt"
            maxLength={500}
            value={banner.alt}
            onChange={(event) => {
              if (event.target.value.trim().length > 0) {
                setBanner({ ...banner, alt: event.target.value });
              }
            }}
          />
        </div>
      )}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button asChild type="button" variant="outline">
            <label htmlFor="form-banner-image" className="cursor-pointer">
              <Upload className="h-4 w-4" aria-hidden="true" />
              {banner ? "Replace banner" : "Add banner"}
              <input
                id="form-banner-image"
                type="file"
                accept={uploadAccept(FORM_BANNER_UPLOAD_POLICY)}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onUpload(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </Button>
          {banner && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setBanner(undefined)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove banner
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function FormBuilderDetailsCard({
  banner,
  description,
  initial,
  instructions,
  mediaInstructions,
  name,
  onUploadBanner,
  onUploadInstruction,
  readOnly,
  setBanner,
  setDescription,
  setInstructions,
  setMediaInstructions,
  setName,
  setSlug,
  slug,
}: {
  banner?: FormDefinition["banner"];
  description: string;
  initial?: BuilderInitial;
  instructions: string;
  mediaInstructions: MediaInstruction[];
  name: string;
  onUploadBanner: (file: File) => Promise<void>;
  onUploadInstruction: (file: File, type: "image" | "video") => Promise<void>;
  readOnly: boolean;
  setBanner: Dispatch<SetStateAction<FormDefinition["banner"] | undefined>>;
  setDescription: Dispatch<SetStateAction<string>>;
  setInstructions: Dispatch<SetStateAction<string>>;
  setMediaInstructions: Dispatch<SetStateAction<MediaInstruction[]>>;
  setName: Dispatch<SetStateAction<string>>;
  setSlug: Dispatch<SetStateAction<string>>;
  slug: string;
}) {
  return (
    <Card className="min-w-0 border-white/10 bg-card/95 shadow-xl shadow-black/20">
      <CardHeader>
        <CardTitle>Form details</CardTitle>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4">
        {initial && (
          <FormBannerEditor
            banner={banner}
            onUpload={onUploadBanner}
            readOnly={readOnly}
            setBanner={setBanner}
          />
        )}
        <div className="grid min-w-0 gap-2">
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
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="form-slug">Stable link slug</Label>
          <Input
            id="form-slug"
            className="h-11"
            disabled={readOnly || Boolean(initial && initial.state !== "draft")}
            value={slug}
            onChange={(event) => setSlug(toSlug(event.target.value))}
          />
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="form-description">Description</Label>
          <Textarea
            disabled={readOnly}
            id="form-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="grid min-w-0 gap-2">
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
          <div className="grid min-w-0 gap-3 rounded-md border border-white/10 bg-background/60 p-3">
            <Label>Instruction media</Label>
            {!readOnly && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  htmlFor="form-instruction-image"
                  className="flex h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/15 bg-card text-muted-foreground transition hover:bg-card/70 sm:h-32"
                >
                  <FileImage className="h-8 w-8" aria-hidden="true" />
                  <span className="text-xs">Select image</span>
                  {/* Native input, not the shared `Input`: that component's
                      baked-in `h-9 w-full` isn't recognized by tailwind-merge
                      as conflicting with `sr-only`, so both apply and the
                      visible sizing wins the cascade. */}
                  <input
                    id="form-instruction-image"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="sr-only"
                    aria-label="Add instruction image"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void onUploadInstruction(file, "image");
                    }}
                  />
                </label>
                <label
                  htmlFor="form-instruction-video"
                  className="flex h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/15 bg-card text-muted-foreground transition hover:bg-card/70 sm:h-32"
                >
                  <FileVideo className="h-8 w-8" aria-hidden="true" />
                  <span className="text-xs">Select video</span>
                  {/* Native input, not the shared `Input`: that component's
                      baked-in `h-9 w-full` isn't recognized by tailwind-merge
                      as conflicting with `sr-only`, so both apply and the
                      visible sizing wins the cascade. */}
                  <input
                    id="form-instruction-video"
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    className="sr-only"
                    aria-label="Add instruction video"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void onUploadInstruction(file, "video");
                    }}
                  />
                </label>
              </div>
            )}
            {mediaInstructions.map((media) => (
              <div
                className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-white/10 bg-card/50 p-2 text-sm"
                key={media.id}
              >
                <InstructionMedia
                  alt={media.alt}
                  attachmentId={media.attachmentId}
                  compact
                  type={media.type}
                />
                <span className="hidden min-w-0 flex-1 truncate sm:block">
                  <span className="capitalize">{media.type}</span>: {media.alt}
                </span>
                {!readOnly && (
                  <Button
                    aria-label={`Remove ${media.type} instruction media`}
                    size="sm"
                    variant="destructive"
                    className="cursor-pointer gap-1.5"
                    onClick={() =>
                      setMediaInstructions((current) =>
                        current.filter(({ id }) => id !== media.id),
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Remove</span>
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
