"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { z } from "zod";

import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { InsertMemberSchema } from "@forge/db/schemas/knight-hacks";
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
import { toast } from "@forge/ui/toast";
import SecondUpdateFormButton from "./second-update";

import { api } from "~/trpc/react";



export default function UpdateMemberButton({
  member,
}: {
  member: InsertMember;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const utils = api.useUtils();

  const updateMember = api.member.updateMember.useMutation({
    onError(opts) {
      toast.error(opts.message);
    },
    async onSettled() {
      await utils.member.invalidate();
      setIsLoading(false);
    },
  });

  const UpdateMemberSchema = InsertMemberSchema.omit({
    userId: true,
    age: true,
    resumeUrl: true,
    discordUser: true,
  }).extend({
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    email: z.string().email("Invalid email").min(1, "Required"),
    points: z.string().transform((points) => Number(points)),
    phoneNumber: z
      .string()
      .regex(/^\d{10}|\d{3}-\d{3}-\d{4}$|^$/, "Invalid phone number"),
  });

  const firstForm = useForm({
    schema: UpdateMemberSchema,
    defaultValues: {
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      points: (member.points ?? 0).toString(),
      phoneNumber: member.phoneNumber || "",
      dob: member.dob || "",
      gender: member.gender,
      school: member.school,
      gradDate: member.gradDate,
      levelOfStudy: member.levelOfStudy,
      raceOrEthnicity: member.raceOrEthnicity,
      shirtSize: member.shirtSize,
      githubProfileUrl: member.githubProfileUrl ?? "",
      linkedinProfileUrl: member.linkedinProfileUrl ?? "",
      websiteUrl: member.websiteUrl ?? "",
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

        <DialogContent>
          <Form {...firstForm}>
            <form
              onSubmit={firstForm.handleSubmit((values) => {
                setIsLoading(true);

                const points = Number(values.points);

                updateMember.mutate({
                  id: member.id,
                  firstName: values.firstName,
                  lastName: values.lastName,
                  email: values.email,
                  points,
                  dob: values.dob,
                  phoneNumber: values.phoneNumber,
                  school: member.school,
                  levelOfStudy: member.levelOfStudy,
                  gender: member.gender,
                  gradDate: member.gradDate,
                  raceOrEthnicity: member.raceOrEthnicity,
                  shirtSize: member.shirtSize,
                  githubProfileUrl: member.githubProfileUrl,
                  linkedinProfileUrl: member.linkedinProfileUrl,
                  websiteUrl: member.websiteUrl,
                });
              })}
            >
              <DialogHeader className="pb-4">
                <DialogTitle>Update Member</DialogTitle>
                <DialogDescription>
                  Update member details. Confirm your changes when you're done.
                </DialogDescription>
              </DialogHeader>

              <div className="m-6 flex flex-col gap-6">
                <FormField
                  control={firstForm.control}
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
                  control={firstForm.control}
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
                  control={firstForm.control}
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
                  control={firstForm.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-4">
                        <FormLabel className="my-auto whitespace-nowrap">
                          Points
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="1000" {...field} />
                        </FormControl>
                        <FormMessage className="my-auto whitespace-nowrap" />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={firstForm.control}
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
                  control={firstForm.control}
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
              </div>
              <DialogFooter className="flex flex-row justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                >
                  Cancel
                </Button>
                  <SecondUpdateFormButton 
                    member={member} 
                    isLoad={isLoading} 
                    setFirstOpen={setIsOpen}
                  />
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
  </>
  );
}