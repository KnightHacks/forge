"use client";

import { useState } from "react";
import { FolderInput, Loader2 } from "lucide-react";
import * as z from "zod";

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  useForm,
} from "@forge/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

const schema = z.object({
  section: z.string().min(1, "Please select or enter a section"),
});

export function MoveFormSectionDialog({
  slug_name,
  currentSection,
}: {
  slug_name: string;
  currentSection?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const utils = api.useUtils();

  const { data: sections = [] } = api.forms.getSections.useQuery(undefined, {
    enabled: isOpen,
  });

  const form = useForm({
    schema: schema,
    defaultValues: {
      section: currentSection ?? "General",
    },
  });

  const updateSection = api.forms.updateFormSection.useMutation({
    onSuccess() {
      toast.success("Form moved to new section");
      setIsOpen(false);
      form.reset();
    },
    onError() {
      toast.error("Failed to move form");
    },
    async onSettled() {
      await utils.forms.getForms.invalidate();
      await utils.forms.getSections.invalidate();
      setIsLoading(false);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Move to section">
          <FolderInput className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => {
              setIsLoading(true);
              updateSection.mutate({
                slug_name,
                section: values.section.trim(),
              });
            })}
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Move Form to Section</DialogTitle>
              <DialogDescription>
                Select an existing section to move this form to.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a section" />
                          </SelectTrigger>
                          <SelectContent>
                            {sections.map((section) => (
                              <SelectItem key={section} value={section}>
                                {section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Move"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
