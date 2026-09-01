"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

import { cn } from "@forge/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@forge/ui/avatar";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import {
  checkUploadMetadata,
  PROFILE_PICTURE_UPLOAD_POLICY,
  uploadAccept,
} from "@forge/validators";

import { useObjectPreviewUrl } from "~/hooks/use-object-preview-url";
import { api } from "~/trpc/react";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("Profile picture could not be read."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Profile picture could not be read."));
    };
    reader.readAsDataURL(file);
  });
}

export function MemberProfilePictureUpload({
  avatarClassName,
  className,
  displayName,
  initialProfilePictureUrl,
  onChange,
  saveMode = "member",
}: {
  avatarClassName?: string;
  className?: string;
  displayName: string;
  initialProfilePictureUrl: string | null;
  onChange?: (profilePictureUrl: string) => void;
  saveMode?: "deferred" | "member";
}) {
  const [profilePictureUrl, setProfilePictureUrl] = useState(
    initialProfilePictureUrl ?? "",
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewFile] = useObjectPreviewUrl();
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const savedProfilePicture = api.profilePicture.getProfilePicture.useQuery(
    undefined,
    {
      enabled:
        saveMode === "member" && Boolean(profilePictureUrl) && !previewUrl,
      staleTime: 60 * 1000,
    },
  );
  const uploadProfilePicture =
    api.profilePicture.uploadProfilePicture.useMutation();
  const updateProfilePicture =
    api.profilePicture.saveMemberProfilePicture.useMutation({
      onSuccess(member) {
        setProfilePictureUrl(member.profilePictureUrl ?? "");
      },
      onError(error) {
        setUploadError(error.message || "Profile picture could not be saved.");
      },
    });

  const isPending =
    uploadProfilePicture.isPending ||
    (saveMode === "member" && updateProfilePicture.isPending);
  const savedPreviewSource = profilePictureUrl
    ? (savedProfilePicture.data?.url ?? null)
    : null;
  const previewSource = previewUrl ?? savedPreviewSource;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const handleFile = async (file: File | undefined) => {
    setUploadError(null);

    if (!file) return;

    const check = checkUploadMetadata(PROFILE_PICTURE_UPLOAD_POLICY, {
      contentType: file.type,
      fileName: file.name,
      size: file.size,
    });
    if (!check.ok) {
      setUploadError(check.message);
      return;
    }

    setPreviewFile(file);

    try {
      const fileContent = await fileToDataUrl(file);
      const objectName = await uploadProfilePicture.mutateAsync({
        fileContent,
        fileName: file.name,
      });

      if (saveMode === "deferred") {
        setProfilePictureUrl(objectName);
        onChange?.(objectName);
        return;
      }

      await updateProfilePicture.mutateAsync({
        profilePictureUrl: objectName,
      });
    } catch (error) {
      if (error instanceof Error) {
        setUploadError(error.message);
      } else {
        setUploadError("Profile picture upload failed.");
      }
      setPreviewFile(null);
    }
  };

  const removeSavedPicture = async () => {
    setUploadError(null);

    try {
      await updateProfilePicture.mutateAsync({ profilePictureUrl: "" });
      setProfilePictureUrl("");
      setPreviewFile(null);
    } catch {
      setUploadError("Profile picture could not be removed.");
    } finally {
      setConfirmRemoveOpen(false);
      fileInputRef.current?.focus();
    }
  };

  const handleRemoveClick = () => {
    setUploadError(null);

    if (saveMode === "deferred") {
      setProfilePictureUrl("");
      setPreviewFile(null);
      onChange?.("");
      return;
    }

    setConfirmRemoveOpen(true);
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative">
        <Avatar
          key={previewSource ?? "initials"}
          className={cn(
            "h-32 w-32 border-4 border-background shadow-2xl shadow-black/40 ring-1 ring-white/15",
            avatarClassName,
          )}
        >
          {previewSource && (
            <AvatarImage
              src={previewSource}
              alt={`${displayName} profile picture`}
              className="object-cover"
            />
          )}
          <AvatarFallback className="bg-primary/15 text-3xl font-semibold text-primary">
            {initials || "KH"}
          </AvatarFallback>
        </Avatar>

        <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-lg shadow-black/30 transition hover:bg-primary/90">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">Upload profile picture</span>
          {/* R-23: the Input primitive's own w-full/h-9 beat sr-only's
              1px box, leaving a viewport-wide absolutely positioned element
              that pushed document scrollWidth past the viewport. */}
          <input
            ref={fileInputRef}
            type="file"
            accept={uploadAccept(PROFILE_PICTURE_UPLOAD_POLICY)}
            className="sr-only"
            disabled={isPending}
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
            }}
          />
        </label>

        {profilePictureUrl && (
          <button
            type="button"
            className="absolute bottom-1 left-1 flex h-9 w-9 items-center justify-center rounded-full border border-background bg-destructive text-destructive-foreground shadow-lg shadow-black/30 transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
            onClick={handleRemoveClick}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Remove profile picture</span>
          </button>
        )}
      </div>

      <div className="text-center">
        {savedProfilePicture.isError && !previewUrl && (
          <p className="text-xs text-muted-foreground">
            Preview unavailable. Your profile picture is still saved.
          </p>
        )}
        {uploadError && (
          <p className="text-xs font-medium text-destructive">{uploadError}</p>
        )}
      </div>

      {saveMode === "member" && (
        <Dialog
          open={confirmRemoveOpen}
          onOpenChange={(open) => {
            if (!updateProfilePicture.isPending) setConfirmRemoveOpen(open);
          }}
        >
          <DialogContent className="max-w-md border-destructive/30">
            <DialogHeader>
              <DialogTitle>Remove profile picture?</DialogTitle>
              <DialogDescription>
                This removes your saved profile picture. You can upload a new
                one anytime.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={updateProfilePicture.isPending}
                onClick={() => setConfirmRemoveOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="gap-2"
                variant="destructive"
                disabled={updateProfilePicture.isPending}
                onClick={() => void removeSavedPicture()}
              >
                {updateProfilePicture.isPending && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Remove picture
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
