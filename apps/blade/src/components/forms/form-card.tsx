"use client";

import { useState } from "react";
import { Edit, Trash2, Copy } from "lucide-react";
import * as z from "zod";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter } from "@forge/ui/card";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, useForm } from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

const renameSchema = z.object({ newName: z.string().min(1) });
const duplicateSchema = z.object({ newName: z.string().min(1) });

export function FormCard({
  name,
  createdAt,
  onOpen,
}: {
  name: string;
  createdAt: string | Date;
  onOpen?: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const utils = api.useUtils();

  const renameForm = api.forms.updateForm.useMutation({
    onSuccess() {
      toast.success("Form renamed");
    },
    onError(err) {
      toast.error(err.message ?? "Rename failed");
    },
    async onSettled() {
      await utils.forms.getForms.invalidate();
      setIsRenaming(false);
    },
  });

  const deleteForm = api.forms.deleteForm.useMutation({
    onSuccess() {
      toast.success("Form deleted");
    },
    onError(err) {
      toast.error(err.message ?? "Delete failed");
    },
    async onSettled() {
      await utils.forms.getForms.invalidate();
    },
  });

  const createForm = api.forms.createForm.useMutation({
    onSuccess() {
      toast.success("Form duplicated");
      setIsDuplicating(false);
    },
    onError(err) {
      toast.error(err.message ?? "Duplicate failed");
    },
    async onSettled() {
      await utils.forms.getForms.invalidate();
    },
  });

  const getForm = api.forms.getForm.useQuery;

  const renameFormHook = useForm({ schema: renameSchema, defaultValues: { newName: "" } });
  const duplicateFormHook = useForm({ schema: duplicateSchema, defaultValues: { newName: "" } });

  const createdDate = new Date(createdAt as any).toLocaleString();

  const handleDelete = async () => {
    if (!confirm(`Delete form "${name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteForm.mutateAsync({ name });
    } catch (err) {
      // handled by mutation
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async (values: z.infer<typeof duplicateSchema>) => {
    try {
      // fetch full form data
      const form = await utils.forms.getForm.fetch({ name });
      const newForm = { ...form.formData, name: values.newName };
      await createForm.mutateAsync(newForm as any);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const handleRename = async (values: z.infer<typeof renameSchema>) => {
    try {
      await renameForm.mutateAsync({ oldName: name, newName: values.newName });
    } catch (err) {
      // handled by mutation
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">Created {createdDate}</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onOpen}>
              Open
            </Button>
            <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>

              <DialogContent>
                <Form {...renameFormHook}>
                  <form
                    onSubmit={renameFormHook.handleSubmit((values) => handleRename(values))}
                    noValidate
                  >
                    <DialogHeader>
                      <DialogTitle>Rename Form</DialogTitle>
                      <DialogDescription>Enter a new unique name for the form.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                      <FormField control={renameFormHook.control} name="newName" render={({ field }) => (
                        <FormItem>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <FormLabel htmlFor="rename" className="text-right">Name</FormLabel>
                            <FormControl>
                              <Input id="rename" {...field} className="col-span-3" />
                            </FormControl>
                          </div>
                        </FormItem>
                      )} />
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRenaming(false)}>Cancel</Button>
                      <Button type="submit" className="ml-2">Rename</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isDuplicating} onOpenChange={setIsDuplicating}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </DialogTrigger>

              <DialogContent>
                <Form {...duplicateFormHook}>
                  <form
                    onSubmit={duplicateFormHook.handleSubmit((values) => handleDuplicate(values))}
                    noValidate
                  >
                    <DialogHeader>
                      <DialogTitle>Duplicate Form</DialogTitle>
                      <DialogDescription>Provide a new name for the duplicated form.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                      <FormField control={duplicateFormHook.control} name="newName" render={({ field }) => (
                        <FormItem>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <FormLabel htmlFor="duplicate" className="text-right">Name</FormLabel>
                            <FormControl>
                              <Input id="duplicate" {...field} className="col-span-3" />
                            </FormControl>
                          </div>
                        </FormItem>
                      )} />
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDuplicating(false)}>Cancel</Button>
                      <Button type="submit" className="ml-2">Duplicate</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">A preview of the form will go here.</p>
      </CardContent>

      <CardFooter>
        <div className="text-sm text-muted-foreground">Actions: Open, Rename, Duplicate, Delete</div>
      </CardFooter>
    </Card>
  );
}
