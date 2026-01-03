"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import * as z from "zod";

import { Button } from "@forge/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  useForm,
} from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

const renameSchema = z.object({ newName: z.string().min(1) });

export function FormCard({
  slug_name,
  createdAt,
  onOpen,
}: {
  slug_name: string;
  createdAt: string | Date;
  onOpen?: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const utils = api.useUtils();

  const deleteForm = api.forms.deleteForm.useMutation({
    onSuccess() {
      toast.success("Form deleted");
    },
    onError() {
      toast.error("Failed to delete form");
    },
    async onSettled() {
      await utils.forms.getForms.invalidate();
    },
  });

  const createForm = api.forms.createForm.useMutation({
    onSuccess() {
      toast.success("Form renamed");
    },
    onError() {
      toast.error("Failed to rename form");
    },
    async onSettled() {
      await utils.forms.getForms.invalidate();
      setIsRenaming(false);
    },
  });

  const renameFormHook = useForm({
    schema: renameSchema,
    defaultValues: { newName: "" },
  });

  const createdDate = new Date(createdAt).toLocaleString();

  const { data: fullForm } = api.forms.getForm.useQuery({ slug_name });

  const handleDelete = async () => {
    if (!confirm(`Delete form "${slug_name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteForm.mutateAsync({ slug_name });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRename = async (values: z.infer<typeof renameSchema>) => {
    if (!fullForm) return;
    try {
      const newPayload = {
        formData: { ...fullForm.formData, name: values.newName },
        duesOnly: fullForm.duesOnly,
        allowResubmission: fullForm.allowResubmission,
      };

      await createForm.mutateAsync(newPayload);
      await deleteForm.mutateAsync({ slug_name });
    } catch {
      // errors handled by mutation
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
      className="cursor-pointer rounded-lg transition hover:bg-card/60 hover:shadow-md hover:ring-2 hover:ring-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <CardHeader className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="truncate text-base font-medium">
            {slug_name}
          </CardTitle>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <DialogContent>
                <Form {...renameFormHook}>
                  <form
                    onSubmit={renameFormHook.handleSubmit(handleRename)}
                    noValidate
                  >
                    <DialogHeader>
                      <DialogTitle>Rename Form</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <FormField
                        control={renameFormHook.control}
                        name="newName"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <FormLabel
                                htmlFor="rename"
                                className="text-right"
                              >
                                Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  id="rename"
                                  {...field}
                                  className="col-span-3"
                                />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsRenaming(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="ml-2">
                        Rename
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Button
              variant="destructive"
              size="sm"
              onClick={async (e) => {
                e.stopPropagation(); // prevent bubbling

                try {
                  await handleDelete(); // await the promise
                } catch (err) {
                  // handle error safely
                  if (err instanceof Error) {
                    toast.error(err.message || "Failed to delete form");
                  } else {
                    toast.error("Failed to delete form");
                  }
                }
              }}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>
        <p className="max-h-12 overflow-hidden text-sm text-muted-foreground">
          {fullForm?.formData.description ?? "No description"}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Created {createdDate}
        </div>
      </CardFooter>

      <div className="flex w-full justify-center gap-4">
        <Button className="w-[40%]" onClick={(e) => e.stopPropagation()}>
          {" "}
          <Link href={`/admin/forms/${slug_name}/responses`}>
            {" "}
            Responses{" "}
          </Link>{" "}
        </Button>
        <Button className="w-[40%]" onClick={(e) => e.stopPropagation()}>
          {" "}
          <Link href={`/admin/forms/${slug_name}`}> Edit Form </Link>{" "}
        </Button>
      </div>
    </Card>
  );
}
