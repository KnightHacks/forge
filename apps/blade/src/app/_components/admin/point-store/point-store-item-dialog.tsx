"use client";

import { useState } from "react";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Switch } from "@forge/ui/switch";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";
import {
  checkUploadMetadata,
  IMAGE_UPLOAD_POLICY,
  pointStoreItemSchema,
  uploadAccept,
} from "@forge/validators";

import { api } from "~/trpc/react";

type Item = RouterOutputs["pointStore"]["workspace"]["items"][number];

export function PointStoreItemDialog({
  hackathonId,
  item,
  onClose,
}: {
  hackathonId: string;
  item?: Item;
  onClose: () => void;
}) {
  const [value, setValue] = useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: String(item?.price ?? 0),
    stock: item?.stock == null ? "" : String(item.stock),
    soldOut: item?.soldOut ?? false,
    archived: item?.archived ?? false,
  });
  const [image, setImage] = useState<
    { fileContent: string; fileName: string } | null | undefined
  >();
  const [reading, setReading] = useState(false);
  const utils = api.useUtils();
  const upload = api.pointStore.setImage.useMutation();
  const save = api.pointStore.saveItem.useMutation({
    onSuccess: async (saved) => {
      if (image !== undefined) {
        try {
          await upload.mutateAsync({
            hackathonId,
            itemId: saved.id,
            revision: saved.revision,
            fileContent: image?.fileContent ?? null,
            fileName: image?.fileName,
          });
        } catch (error) {
          toast.error(
            `Item saved, but the image could not be saved: ${error instanceof Error ? error.message : "Try editing the item again."}`,
          );
        }
      }
      await utils.pointStore.workspace.invalidate({ hackathonId });
      toast.success("Item saved.");
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });
  const busy = reading || save.isPending || upload.isPending;
  async function chooseImage(file: File) {
    const check = checkUploadMetadata(IMAGE_UPLOAD_POLICY, {
      contentType: file.type,
      fileName: file.name,
      size: file.size,
    });
    if (!check.ok) {
      toast.error(check.message);
      return;
    }
    setReading(true);
    try {
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read this image."));
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("Could not read this image."));
        reader.readAsDataURL(file);
      });
      setImage({ fileContent, fileName: file.name });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not read this image.",
      );
    } finally {
      setReading(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>
            List each size as its own item. Leave stock blank when you are not
            counting inventory.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = pointStoreItemSchema.safeParse({
              hackathonId,
              id: item?.id,
              revision: item?.revision,
              ...value,
              price: Number(value.price),
              stock: value.stock === "" ? null : Number(value.stock),
            });
            if (!parsed.success) {
              toast.error(
                parsed.error.issues[0]?.message ?? "Check the item details.",
              );
              return;
            }
            save.mutate(parsed.data);
          }}
        >
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Name</Label>
              <Input
                id="item-name"
                required
                maxLength={120}
                value={value.name}
                onChange={(e) => setValue({ ...value, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
                maxLength={2000}
                value={value.description}
                onChange={(e) =>
                  setValue({ ...value, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="item-price">Point price</Label>
                <Input
                  id="item-price"
                  type="number"
                  min={0}
                  max={1_000_000}
                  step={1}
                  required
                  value={value.price}
                  onChange={(e) =>
                    setValue({ ...value, price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-stock">Stock, optional</Label>
                <Input
                  id="item-stock"
                  type="number"
                  min={0}
                  max={1_000_000}
                  step={1}
                  value={value.stock}
                  onChange={(e) =>
                    setValue({ ...value, stock: e.target.value })
                  }
                  placeholder="Untracked"
                />
              </div>
            </div>
            {value.stock === "" && (
              <label className="flex min-h-11 items-center justify-between gap-3">
                Sold out
                <Switch
                  checked={value.soldOut}
                  onCheckedChange={(soldOut) => setValue({ ...value, soldOut })}
                />
              </label>
            )}
            <div className="space-y-2">
              <Label htmlFor="item-image">Image, optional</Label>
              <Input
                id="item-image"
                type="file"
                accept={uploadAccept(IMAGE_UPLOAD_POLICY)}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void chooseImage(file);
                }}
              />
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, GIF or WebP, up to 2 MB.
              </p>
              {image ? (
                <p className="break-words text-sm">{image.fileName}</p>
              ) : image === null ? (
                <p className="text-sm">Image will be removed.</p>
              ) : null}
              {(item?.imageUrl || image) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setImage(null)}
                >
                  Remove image
                </Button>
              )}
            </div>
            {item && (
              <label className="flex min-h-11 items-center justify-between gap-3">
                Archive item
                <Switch
                  checked={value.archived}
                  onCheckedChange={(archived) =>
                    setValue({ ...value, archived })
                  }
                />
              </label>
            )}
            <Button className="min-h-11" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save item"}
            </Button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
