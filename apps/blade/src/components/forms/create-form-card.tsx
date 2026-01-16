"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import * as z from "zod";

import { Button } from "@forge/ui/button";
import { Card, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

const schema = z.object({
  name: z.string().min(1, "Please enter a name"),
  description: z.string().max(500).optional(),
});

export function CreateFormCard({ section }: { section?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const utils = api.useUtils();

  const form = useForm({
    schema: schema,
    defaultValues: {
      name: "",
      description: undefined,
    },
  });

  const createForm = api.forms.createForm.useMutation({
    onSuccess() {
      toast.success("Form created");
      setIsOpen(false);
    },
    onError() {
      toast.error("Failed to create form");
    },
    async onSettled() {
      await utils.forms.getForms.invalidate();
      await utils.forms.getSections.invalidate();
      await utils.forms.invalidate();
      setIsLoading(false);
    },
  });

  return (
    <Card className="items-center justify-center p-6 text-center">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="border border-dashed">
            <Plus className="mr-2 h-4 w-4" /> Create Form
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-lg">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(async (values) => {
                setIsLoading(true);

                const payload = {
                  formData: {
                    name: values.name,
                    description: values.description ?? "",
                    questions: [],
                  },
                  duesOnly: false,
                  allowResubmission: false,
                  section: section, // Pass section during creation
                };

                await createForm.mutateAsync(payload);
              })}
              noValidate
            >
              <DialogHeader>
                <DialogTitle>Create New Form</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <FormLabel htmlFor="name" className="text-right">
                          Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="name"
                            placeholder="Form name"
                            {...field}
                            className="col-span-3"
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-4 items-start gap-4">
                        <FormLabel htmlFor="description" className="text-right">
                          Description
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            id="description"
                            placeholder="Short description"
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
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="ml-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <CardHeader>
        <CardTitle>Create a new form</CardTitle>
      </CardHeader>
    </Card>
  );
}
