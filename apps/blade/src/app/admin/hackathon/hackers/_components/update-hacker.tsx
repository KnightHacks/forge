"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { z } from "zod";

import type { InsertHacker } from "@forge/db/schemas/knight-hacks";
import { FORMS } from "@forge/consts";
import { InsertHackerSchema } from "@forge/db/schemas/knight-hacks";
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
  FormMessage,
  useForm,
} from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

/**
 * Render a button that opens a modal form for editing a hacker's details.
 *
 * The dialog contains a form prefilled from the provided `hacker`, submits updates
 * to the server, shows success or error toasts, and refreshes hacker data after the mutation settles.
 *
 * @param hacker - Hacker data used to populate form fields and to identify which record to update.
 * @returns A React element rendering the update button and the update-modal form.
 */
export default function UpdateHackerButton({
  hacker,
}: {
  hacker: InsertHacker;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const utils = api.useUtils();

  const updateHacker = api.hacker.updateHacker.useMutation({
    onSuccess() {
      toast.success("Hacker updated successfully!");
      setIsOpen(false);
    },
    onError(opts) {
      toast.error(opts.message);
    },
    async onSettled() {
      await utils.hacker.invalidate();
      setIsLoading(false);
    },
  });

  const UpdateHackerSchema = InsertHackerSchema.omit({
    userId: true,
    age: true,
    resumeUrl: true,
    discordUser: true,
  }).extend({
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    email: z.string().email("Invalid email").min(1, "Required"),
    phoneNumber: z
      .string()
      .regex(/^\d{10}|\d{3}-\d{3}-\d{4}$|^$/, "Invalid phone number"),
  });

  const form = useForm({
    schema: UpdateHackerSchema,
    defaultValues: {
      firstName: hacker.firstName || "",
      lastName: hacker.lastName || "",
      email: hacker.email || "",
      phoneNumber: hacker.phoneNumber || "",
      dob: hacker.dob || "",
      gender: hacker.gender,
      school: hacker.school,
      gradDate: hacker.gradDate,
      levelOfStudy: hacker.levelOfStudy,
      raceOrEthnicity: hacker.raceOrEthnicity,
      shirtSize: hacker.shirtSize,
      githubProfileUrl: hacker.githubProfileUrl ?? "",
      linkedinProfileUrl: hacker.linkedinProfileUrl ?? "",
      websiteUrl: hacker.websiteUrl ?? "",
      survey1: hacker.survey1,
      survey2: hacker.survey2,
      isFirstTime: hacker.isFirstTime,
      foodAllergies: hacker.foodAllergies,
      agreesToReceiveEmailsFromMLH: hacker.agreesToReceiveEmailsFromMLH,
    },
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-h-screen overflow-y-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => {
                setIsLoading(true);

                updateHacker.mutate({
                  id: hacker.id,
                  firstName: values.firstName,
                  lastName: values.lastName,
                  email: values.email,
                  dob: values.dob,
                  phoneNumber: values.phoneNumber,
                  school: values.school,
                  levelOfStudy: values.levelOfStudy,
                  gender: values.gender,
                  gradDate: values.gradDate,
                  raceOrEthnicity: values.raceOrEthnicity,
                  shirtSize: values.shirtSize,
                  githubProfileUrl: values.githubProfileUrl,
                  linkedinProfileUrl: values.linkedinProfileUrl,
                  websiteUrl: values.websiteUrl,
                  survey1: values.survey1,
                  survey2: values.survey2,
                  isFirstTime: values.isFirstTime,
                  foodAllergies: values.foodAllergies,
                  agreesToReceiveEmailsFromMLH:
                    values.agreesToReceiveEmailsFromMLH,
                });
              })}
            >
              <DialogHeader className="pb-4">
                <DialogTitle>Update Hacker</DialogTitle>
                <DialogDescription className="whitespace-break-spaces">
                  Update hacker details. Confirm your changes when you're done.
                </DialogDescription>
              </DialogHeader>

              <div className="mb-6 mt-6 flex flex-col gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-4">
                        <FormLabel className="my-auto whitespace-nowrap">
                          First Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Lenny" {...field} />
                        </FormControl>
                        <FormMessage className="my-auto whitespace-nowrap" />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-4">
                        <FormLabel className="my-auto whitespace-nowrap">
                          Last Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Dragonson" {...field} />
                        </FormControl>
                        <FormMessage className="my-auto whitespace-nowrap" />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-4">
                        <FormLabel className="my-auto whitespace-nowrap">
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="tk@knighthacks.org" {...field} />
                        </FormControl>
                        <FormMessage className="my-auto whitespace-nowrap" />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-4">
                        <FormLabel className="my-auto whitespace-nowrap">
                          Phone Number
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="123-456-7890" {...field} />
                        </FormControl>
                        <FormMessage className="my-auto whitespace-nowrap" />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-4">
                        <FormLabel className="my-auto whitespace-nowrap">
                          Date Of Birth
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage className="my-auto whitespace-nowrap" />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="school"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-4">
                        <FormLabel className="my-auto whitespace-nowrap">
                          School
                        </FormLabel>
                        <FormControl>
                          <ResponsiveComboBox
                            items={FORMS.SCHOOLS}
                            renderItem={(school) => <div>{school}</div>}
                            getItemValue={(school) => school}
                            getItemLabel={(school) => school}
                            onItemSelect={(school) => field.onChange(school)}
                            buttonPlaceholder={hacker.school}
                            inputPlaceholder="Search for school"
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gradDate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-4">
                        <FormLabel className="my-auto whitespace-nowrap">
                          Grad Date
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage className="my-auto whitespace-nowrap" />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="levelOfStudy"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-4">
                        <FormLabel className="my-auto whitespace-nowrap">
                          Level Of Study
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="max-w-[300px] overflow-hidden truncate">
                                <SelectValue placeholder="Select level of study" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FORMS.LEVELS_OF_STUDY.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="my-auto whitespace-nowrap" />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shirtSize"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-4">
                        <FormLabel className="my-auto whitespace-nowrap">
                          Shirt Size
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select shirt size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FORMS.SHIRT_SIZES.map((shirt_size) => (
                                <SelectItem key={shirt_size} value={shirt_size}>
                                  {shirt_size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="whitespace-nowrap" />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="flex flex-row justify-between">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsOpen(false);
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <div className="flex items-center justify-center">
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Button type="submit">Update Hacker</Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}