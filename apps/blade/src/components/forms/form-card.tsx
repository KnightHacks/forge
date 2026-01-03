"use client";

import { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import * as z from "zod";

import { Card, CardHeader, CardTitle, CardContent, CardAction, CardFooter } from "@forge/ui/card";
import { Button } from "@forge/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@forge/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, useForm } from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

const renameSchema = z.object({ newName: z.string().min(1) });

export function FormCard({ name, createdAt, onOpen }: { name: string; createdAt: string | Date; onOpen?: () => void; }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const utils = api.useUtils();

  const deleteForm = api.forms.deleteForm.useMutation({
    onSuccess() {
      toast.success("Form deleted");
    },
    onError(err) {
      toast.error(err.message ?? "Failed to delete form");
    },
    async onSettled() {
      await utils.forms.getForms.invalidate();
    },
  });

  const createForm = api.forms.createForm.useMutation({
    onSuccess() {
      toast.success("Form renamed");
    },
    onError(err) {
      toast.error(err.message ?? "Failed to rename form");
    },
    async onSettled() {
      await utils.forms.getForms.invalidate();
      setIsRenaming(false);
    },
  });

  const renameFormHook = useForm({ schema: renameSchema, defaultValues: { newName: "" } });

  const createdDate = new Date(createdAt).toLocaleString();

  const { data: fullForm } = api.forms.getForm.useQuery({ name });

  const handleDelete = async () => {
    if (!confirm(`Delete form "${name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteForm.mutateAsync({ name });
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
      await deleteForm.mutateAsync({ name });
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
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(); }
      }}
      className="cursor-pointer transition hover:shadow-md hover:bg-card/60 hover:ring-2 hover:ring-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
    >
      <CardHeader className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="text-base font-medium truncate">{name}</CardTitle>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}>
                <Edit className="h-4 w-4" />
              </Button>
              <DialogContent>
                <Form {...renameFormHook}>
                  <form onSubmit={renameFormHook.handleSubmit(handleRename)} noValidate>
                    <DialogHeader><DialogTitle>Rename Form</DialogTitle></DialogHeader>
                    <div className="py-4">
                      <FormField
                        control={renameFormHook.control}
                        name="newName"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <FormLabel htmlFor="rename" className="text-right">Name</FormLabel>
                              <FormControl>
                                <Input id="rename" {...field} className="col-span-3" />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRenaming(false)}>Cancel</Button>
                      <Button type="submit" className="ml-2">Rename</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Button variant="destructive" size="sm" onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
  }} disabled={isDeleting}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground max-h-12 overflow-hidden">
          {fullForm ? fullForm.formData.description ?? "No description" : "No description"}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Created {createdDate}</div>
      </CardFooter>
    </Card>
  );
}
