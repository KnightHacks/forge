"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import {
  GENDERS,
  KNIGHTHACKS_MAX_RESUME_SIZE,
  LEVELS_OF_STUDY,
  RACES_OR_ETHNICITIES,
  SCHOOLS,
  SHIRT_SIZES,
} from "@forge/consts/knight-hacks";
import { InsertMemberSchema } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
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
import { Separator } from "@forge/ui/separator";
import { toast } from "@forge/ui/toast";

import type { api as serverCaller } from "~/trpc/server";
import { api } from "~/trpc/react";
import { MemberAppCard } from "../_components/option-cards";
import DeleteMemberButton from "./_components/delete-member-button";

export function MemberProfileForm({
  data,
}: {
  data: Awaited<ReturnType<(typeof serverCaller.member)["getMember"]>>;
}) {
  const [loading, setLoading] = useState(false);
  const utils = api.useUtils();

  const { data: member, isError } = api.member.getMember.useQuery(undefined, {
    initialData: data,
  });

  const updateMember = api.member.updateMember.useMutation({
    async onSuccess() {
      toast.success("Profile updated!");
      await utils.member.getMember.invalidate();
    },
    onError() {
      toast.error("Oops! Something went wrong. Please try again later.");
    },
    onSettled() {
      setLoading(false);
    },
  });

  const uploadResume = api.resume.uploadResume.useMutation({
    onError() {
      toast.error("There was a problem storing your resume, please try again!");
    },
    async onSettled() {
      await utils.resume.invalidate();
    },
  });

  const form = useForm({
    schema: InsertMemberSchema.omit({ age: true, userId: true }).extend({
      firstName: z.string().min(1, "Required"),
      lastName: z.string().min(1, "Required"),
      // Age will be derived from dob on the server
      age: z.undefined(),
      email: z.string().email("Invalid email").min(1, "Required"),
      phoneNumber: z
        .string()
        // validates phone number with/without dashes
        .regex(/^\d{10}|\d{3}-\d{3}-\d{4}$|^$/, "Invalid phone number"),
      // Read from date input as string, convert and validate as date, then transform to ISO string
      resumeUpload: z
        .instanceof(FileList)
        .superRefine((fileList, ctx) => {
          // Validate number of files is 0 or 1
          if (fileList.length !== 0 && fileList.length !== 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Only 0 or 1 files allowed",
            });
          }

          if (fileList.length === 1) {
            // Validate type of object in FileList is File
            if (fileList[0] instanceof File) {
              // Validate file extension is PDF
              const fileExtension = fileList[0].name.split(".").pop();
              if (fileExtension !== "pdf") {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Resume must be a PDF",
                });
              }

              // Validate file size is <= 5MB
              if (fileList[0].size > KNIGHTHACKS_MAX_RESUME_SIZE) {
                ctx.addIssue({
                  code: z.ZodIssueCode.too_big,
                  type: "number",
                  maximum: KNIGHTHACKS_MAX_RESUME_SIZE,
                  inclusive: true,
                  exact: false,
                  message: "File too large: maximum 5MB",
                });
              }
            } else {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Object in FileList is undefined",
              });
            }
          }
        })
        .optional(),
      dob: z
        .string()
        .pipe(z.coerce.date())
        .transform((date) => date.toISOString()),
      gradDate: z.string(),
      githubProfileUrl: z
        .string()
        .regex(/^https:\/\/.+/, "Invalid URL: Please try again with https://")
        .regex(
          /^https:\/\/w?w?w?\.?github\.com\/.+/,
          "Invalid URL: Enter a valid GitHub link",
        )
        .url({ message: "Invalid URL" })
        .optional()
        .or(z.literal("")),
      linkedinProfileUrl: z
        .string()
        .regex(/^https:\/\/.+/, "Invalid URL: Please try again with https://")
        .regex(
          /^https:\/\/w?w?w?\.?linkedin\.com\/.+/,
          "Invalid URL: Enter a valid LinkedIn link",
        )
        .url({ message: "Invalid URL" })
        .optional()
        .or(z.literal("")),
      websiteUrl: z
        .string()
        .regex(
          /^https?:\/\/.+/,
          "Invalid URL: Please try again with https:// or http://",
        )
        .url({ message: "Invalid URL" })
        .optional()
        .or(z.literal("")),
    }),
    defaultValues: {
      firstName: member?.firstName,
      lastName: member?.lastName,
      email: member?.email ?? "",
      phoneNumber: member?.phoneNumber ?? "",
      dob: member?.dob,
      gradDate: member?.gradDate,
      githubProfileUrl: member?.githubProfileUrl ?? "",
      linkedinProfileUrl: member?.linkedinProfileUrl ?? "",
      websiteUrl: member?.websiteUrl ?? "",
      gender: member?.gender,
      levelOfStudy: member?.levelOfStudy,
      raceOrEthnicity: member?.raceOrEthnicity,
      shirtSize: member?.shirtSize,
      school: member?.school,
      discordUser: member?.discordUser,
    },
  });

  const fileRef = form.register("resumeUpload");

  // Convert a resume to base64 for client-server transmission
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Check type before resolving as string
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(
            new Error(
              "Failed to convert file to Base64: Unexpected result type",
            ),
          );
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  if (isError) {
    return (
      <div className="flex items-center justify-center">
        Something went wrong. Please refresh and try again.
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center">
        <MemberAppCard />
      </div>
    );
  }

  return (
    <>
      <Form {...form}>
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            try {
              setLoading(true);
              let resumeUrl = "";
              if (values.resumeUpload?.length && values.resumeUpload[0]) {
                const file = values.resumeUpload[0];
                const base64File = await fileToBase64(file);
                resumeUrl = await uploadResume.mutateAsync({
                  fileName: file.name,
                  fileContent: base64File,
                });
              }

              updateMember.mutate({
                ...values,
                id: member.id,
                resumeUrl, // Include uploaded resume URL
              });
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error(
                "Error uploading resume or updating member:",
                error,
              );
              toast.error(
                "Something went wrong while processing your changes.",
              );
            }
          })}
        >
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  First Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Lenny" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Last Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Dragonson" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="tk@knighthacks.org" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Phone Number
                  <span className="text-gray-400">
                    {" "}
                    &mdash; <i>Optional</i>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="123-456-7890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dob"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>
                  Date Of Birth <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="resumeUpload"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Resume
                  <span className="text-gray-400">
                    {" "}
                    &mdash; <i>Optional</i>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    placeholder=""
                    {...fileRef}
                    onChange={(event) => {
                      field.onChange(event.target.files?.[0] ?? undefined);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="!mt-10">
            <h3 className="text-lg font-medium">Demographic Information</h3>
            <p className="text-sm text-muted-foreground">
              This is some additional information about you.
            </p>
          </div>
          <Separator />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Gender
                  <span className="text-gray-400">
                    {" "}
                    &mdash; <i>Optional</i>
                  </span>
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENDERS.map((gender) => (
                        <SelectItem key={gender} value={gender}>
                          {gender}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="raceOrEthnicity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Race or Ethnicity
                  <span className="text-gray-400">
                    {" "}
                    &mdash; <i>Optional</i>
                  </span>
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your race or ethnicity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RACES_OR_ETHNICITIES.map((raceOrEthnicity) => (
                        <SelectItem
                          key={raceOrEthnicity}
                          value={raceOrEthnicity}
                        >
                          {raceOrEthnicity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="shirtSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Shirt Size <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your shirt size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SHIRT_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="!mt-10">
            <h3 className="text-lg font-medium">Academic Information</h3>
            <p className="text-sm text-muted-foreground">
              This is where you go to school and what you're studying.
            </p>
          </div>
          <Separator />
          <FormField
            control={form.control}
            name="levelOfStudy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Level of Study <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your level of study" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEVELS_OF_STUDY.map((levelOfStudy) => (
                        <SelectItem key={levelOfStudy} value={levelOfStudy}>
                          {levelOfStudy}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="school"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  School <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <ResponsiveComboBox
                    items={SCHOOLS}
                    renderItem={(school) => <div>{school}</div>}
                    getItemValue={(school) => school}
                    getItemLabel={(school) => school}
                    onItemSelect={(school) => field.onChange(school)}
                    buttonPlaceholder={member.school}
                    inputPlaceholder="Search for your school"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gradDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>
                  Graduation Date <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="!mt-10">
            <h3 className="text-lg font-medium">Additional Links</h3>
            <p className="text-sm text-muted-foreground">
              Feel free to include what makes you, you.
            </p>
          </div>
          <Separator />
          <FormField
            control={form.control}
            name="githubProfileUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  GitHub Profile
                  <span className="text-gray-400">
                    {" "}
                    &mdash; <i>Optional</i>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://github.com/knighthacks"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="linkedinProfileUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Linkedin Profile
                  <span className="text-gray-400">
                    {" "}
                    &mdash; <i>Optional</i>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://www.linkedin.com/company/knight-hacks"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Personal Website
                  <span className="text-gray-400">
                    {" "}
                    &mdash; <i>Optional</i>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://knighthacks.org" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Button type="submit">Update Profile</Button>
          )}
        </form>
      </Form>
      <div className="!mt-12">
        <h3 className="text-lg font-medium text-red-700">Danger Zone</h3>
        <p className="mb-4 text-sm text-red-700/75">
          Avoid this if you're not sure what you're doing.
        </p>
        <DeleteMemberButton
          memberId={member.id}
          firstName={member.firstName}
          lastName={member.lastName}
        />
      </div>
    </>
  );
}
