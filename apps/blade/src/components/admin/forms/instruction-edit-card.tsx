"use client";

import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { z } from "zod";
import { useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripHorizontal,
  Image as ImageIcon,
  Loader2,
  Trash,
  Video,
  X,
} from "lucide-react";

import type { InstructionValidator } from "@forge/consts/knight-hacks";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";
import { useMediaQuery } from "@forge/ui/use-media-query";

import { api } from "~/trpc/react";

type FormInstruction = z.infer<typeof InstructionValidator>;

interface InstructionEditCardProps {
  instruction: FormInstruction & { id: string };
  formId: string;
  onUpdate: (updatedInstruction: FormInstruction & { id: string }) => void;
  onDelete: (id: string) => void;
  onDuplicate: (instruction: FormInstruction & { id: string }) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  dragHandleProps?: DraggableSyntheticListeners;
}

export function InstructionEditCard({
  instruction,
  formId,
  onUpdate,
  onDelete,
  onDuplicate,
  dragHandleProps,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: InstructionEditCardProps) {
  const isMobile = !useMediaQuery("(min-width: 768px)");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const getUploadUrlMutation = api.forms.getUploadUrl.useMutation();

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...instruction, title: e.target.value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploadingImage(true);

    try {
      const result = await getUploadUrlMutation.mutateAsync({
        fileName: file.name,
        formId,
        mediaType: "image",
      });

      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      onUpdate({
        ...instruction,
        imageObjectName: result.objectName,
        imageUrl: result.viewUrl,
      });
      toast.success("Image uploaded successfully!");
    } catch {
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be less than 100MB");
      return;
    }

    setIsUploadingVideo(true);

    try {
      const result = await getUploadUrlMutation.mutateAsync({
        fileName: file.name,
        formId,
        mediaType: "video",
      });

      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      onUpdate({
        ...instruction,
        videoObjectName: result.objectName,
        videoUrl: result.viewUrl,
      });
      toast.success("Video uploaded successfully!");
    } catch {
      toast.error("Failed to upload video. Please try again.");
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-4 bg-card px-4 py-6 text-card-foreground transition-all md:p-6",
        "mt-12 border-t-4 border-t-primary shadow-lg",
      )}
    >
      {/* Title */}
      <div className="flex-1 rounded-md bg-muted/50 p-2 transition-colors focus-within:bg-muted focus-within:ring-1 focus-within:ring-primary/20">
        <Textarea
          value={instruction.title}
          onChange={handleTitleChange}
          placeholder="Instruction Title"
          className="min-h-[3rem] resize-none overflow-hidden border-none bg-transparent px-0 py-0 text-lg font-medium placeholder:text-muted-foreground focus-visible:ring-0"
          rows={1}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = `${target.scrollHeight}px`;
          }}
        />
      </div>

      {/* Body */}
      <div className="w-full space-y-4 pt-2">
        <Textarea
          value={instruction.content || ""}
          onChange={(e) =>
            onUpdate({ ...instruction, content: e.target.value })
          }
          placeholder="Instruction content (optional)"
          className="min-h-[80px] resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
        />

        {/* Media Upload Section */}
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="mr-2 h-4 w-4" />
              )}
              {instruction.imageUrl ? "Change Image" : "Upload Image"}
            </Button>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploadingVideo}
            >
              {isUploadingVideo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Video className="mr-2 h-4 w-4" />
              )}
              {instruction.videoUrl ? "Change Video" : "Upload Video"}
            </Button>
          </div>

          {/* Image Preview */}
          {instruction.imageUrl && (
            <div className="relative">
              <p className="mb-2 text-xs text-muted-foreground">Image:</p>
              <div className="relative h-48 w-full">
                <Image
                  src={instruction.imageUrl}
                  alt="Preview"
                  fill
                  className="rounded border object-contain"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() =>
                    onUpdate({
                      ...instruction,
                      imageUrl: undefined,
                      imageObjectName: undefined,
                    })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Video Preview */}
          {instruction.videoUrl && (
            <div className="relative">
              <p className="mb-2 text-xs text-muted-foreground">Video:</p>
              <div className="relative">
                <video
                  src={instruction.videoUrl}
                  controls
                  className="max-h-48 w-full rounded border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() =>
                    onUpdate({
                      ...instruction,
                      videoUrl: undefined,
                      videoObjectName: undefined,
                    })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
        {isMobile ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              disabled={!canMoveUp}
              className="rounded p-1 text-gray-300 hover:text-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Move up"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              disabled={!canMoveDown}
              className="rounded p-1 text-gray-300 hover:text-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Move down"
            >
              <ArrowDown className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div
            className="cursor-move text-gray-300 hover:text-gray-500"
            {...dragHandleProps}
          >
            <GripHorizontal className="h-5 w-5 rotate-90" />
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <Copy
            className="h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700"
            onClick={() => onDuplicate(instruction)}
          />
          <Trash
            className="h-5 w-5 cursor-pointer text-gray-500 hover:text-red-600"
            onClick={() => onDelete(instruction.id)}
          />
        </div>
      </div>
    </Card>
  );
}
