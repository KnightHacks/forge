"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import {
  ALLERGIES,
  GENDERS,
  KNIGHTHACKS_MAX_RESUME_SIZE,
  LEVELS_OF_STUDY,
  MAJORS,
  RACES_OR_ETHNICITIES,
  SCHOOLS,
  SHIRT_SIZES,
} from "@forge/consts/knight-hacks";
import { InsertHackerSchema } from "@forge/db/schemas/knight-hacks";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
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
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import type { api as serverCaller } from "~/trpc/server";
import { api } from "~/trpc/react";
import DeleteHackerButton from "~/app/_components/settings/delete-hacker-button";
import { HackerAppCard } from "~/app/_components/option-cards";

export function HackerProfileForm({
  data,
  hackathon,
}: {
  data: Awaited<ReturnType<(typeof serverCaller.hacker)["getHacker"]>>;
  hackathon: Awaited<
    ReturnType<(typeof serverCaller.hackathon)["getCurrentHackathon"]>
  >;
}) {
  const [loading, setLoading] = useState(false);
  const utils = api.useUtils();

  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const allergiesRef = useRef<string[]>([]);

  const { data: hacker, isError } = api.hacker.getHacker.useQuery(
    {},
    {
      initialData: data,
    },
  );

  const uploadResume = api.resume.uploadResume.useMutation({
    onError() {
      toast.error("There was a problem storing your resume, please try again!");
    },
    async onSettled() {
      await utils.resume.invalidate();
    },
  });

  const updateHacker = api.hacker.updateHacker.useMutation({
    async onSuccess() {
      toast.success("Profile updated!");
      await utils.hacker.getHacker.invalidate();
    },
    onError() {
      toast.error("Oops! Something went wrong. Please try again later.");
    },
    onSettled() {
      setLoading(false);
    },
  });

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy],
    );
    allergiesRef.current = allergiesRef.current.includes(allergy)
      ? allergiesRef.current.filter((a) => a !== allergy)
      : [...allergiesRef.current, allergy];
  };

  const form = useForm({
    schema: InsertHackerSchema.extend({
      userId: z.undefined(),
      firstName: z.string().min(1, "Required"),
      lastName: z.string().min(1, "Required"),
      age: z.undefined(),
      email: z.string().email("Invalid email").min(1, "Required"),
      phoneNumber: z
        .string()
        .regex(/^(\d{10}|\d{3}-\d{3}-\d{4})?$/, "Invalid phone number"),
      dob: z
        .string()
        .pipe(z.coerce.date())
        .transform((date) => date.toISOString()),
      gradDate: z.string(),
      survey1: z.string().min(1, "Required"),
      survey2: z.string().min(1, "Required"),
      githubProfileUrl: z
        .string()
        .regex(/^https:\/\/.+/, "Invalid URL: Please try again with https://")
        .regex(
          /^https:\/\/(www\.)?github\.com\/.+/,
          "Invalid URL: Enter a valid GitHub link",
        )
        .url({ message: "Invalid URL" })
        .optional()
        .or(z.literal("")),
      linkedinProfileUrl: z
        .string()
        .regex(/^https:\/\/.+/, "Invalid URL: Please try again with https://")
        .regex(
          /^https:\/\/(www\.)?linkedin\.com\/.+/,
          "Invalid URL: Enter a valid LinkedIn link",
        )
        .regex(
          /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/,
          "Invalid URL: Do not use a mobile URL/excessively long URL",
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
      resumeUpload: z
        .instanceof(FileList)
        .superRefine((fileList, ctx) => {
          if (fileList.length !== 0 && fileList.length !== 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Only 0 or 1 files allowed",
            });
          }

          if (fileList.length === 1) {
            const file = fileList[0];
            if (!(file instanceof File)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Object in FileList is undefined",
              });
              return;
            }

            const fileExtension = file.name.split(".").pop();
            if (fileExtension !== "pdf") {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Resume must be a PDF",
              });
            }

            if (file.size > KNIGHTHACKS_MAX_RESUME_SIZE) {
              ctx.addIssue({
                code: z.ZodIssueCode.too_big,
                type: "number",
                maximum: KNIGHTHACKS_MAX_RESUME_SIZE,
                inclusive: true,
                exact: false,
                message: "File too large: maximum 5MB",
              });
            }
          }
        })
        .optional(),
      agreesToMLHCodeOfConduct: z.boolean().refine((val) => val === true),
      agreesToMLHDataSharing: z.boolean().refine((val) => val === true),
    }),
    defaultValues: {
      firstName: hacker?.firstName ?? "",
      lastName: hacker?.lastName ?? "",
      gender: hacker?.gender ?? undefined,
      raceOrEthnicity: hacker?.raceOrEthnicity ?? undefined,
      discordUser: hacker?.discordUser,
      email: hacker?.email ?? "",
      phoneNumber: hacker?.phoneNumber ?? "",
      school: hacker?.school ?? undefined,
      major: hacker?.major ?? undefined,
      levelOfStudy: hacker?.levelOfStudy ?? undefined,
      shirtSize: hacker?.shirtSize ?? undefined,
      githubProfileUrl: hacker?.githubProfileUrl ?? "",
      linkedinProfileUrl: hacker?.linkedinProfileUrl ?? "",
      websiteUrl: hacker?.websiteUrl ?? "",
      dob: hacker?.dob ?? "",
      gradDate: hacker?.gradDate ?? "",
      survey1: hacker?.survey1 ?? "",
      survey2: hacker?.survey2 ?? "",
      isFirstTime: hacker?.isFirstTime ?? false,
      foodAllergies: hacker?.foodAllergies ?? "",
      agreesToReceiveEmailsFromMLH:
        hacker?.agreesToReceiveEmailsFromMLH ?? false,
      agreesToMLHCodeOfConduct: false,
      agreesToMLHDataSharing: false,
    },
  });

  const fileRef = form.register("resumeUpload");

  useEffect(() => {
    if (!hacker) return;
    form.reset({
      firstName: hacker.firstName,
      lastName: hacker.lastName,
      gender: hacker.gender,
      raceOrEthnicity: hacker.raceOrEthnicity,
      discordUser: hacker.discordUser,
      email: hacker.email,
      phoneNumber: hacker.phoneNumber ?? "",
      school: hacker.school,
      major: hacker.major,
      levelOfStudy: hacker.levelOfStudy,
      shirtSize: hacker.shirtSize,
      githubProfileUrl: hacker.githubProfileUrl ?? "",
      linkedinProfileUrl: hacker.linkedinProfileUrl ?? "",
      websiteUrl: hacker.websiteUrl ?? "",
      dob: hacker.dob,
      gradDate: hacker.gradDate,
      survey1: hacker.survey1,
      survey2: hacker.survey2,
      isFirstTime: hacker.isFirstTime ?? false,
      foodAllergies: hacker.foodAllergies ?? "",
      agreesToReceiveEmailsFromMLH:
        hacker.agreesToReceiveEmailsFromMLH ?? false,
      agreesToMLHCodeOfConduct: hacker.agreesToMLHCodeOfConduct ?? false,
      agreesToMLHDataSharing: hacker.agreesToMLHDataSharing ?? false,
    });

    if (hacker.foodAllergies) {
      setSelectedAllergies(hacker.foodAllergies.split(","));
      allergiesRef.current = hacker.foodAllergies.split(",");
    }
  }, [hacker, form]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Failed to convert file to Base64"));
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

  if (!hacker) {
    return (
      <div className="flex items-center justify-center">
        <HackerAppCard hackathonName={hackathon?.name || ""} />
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
            setLoading(true);
            try {
              let resumeUrl = "";
              if (values.resumeUpload?.length && values.resumeUpload[0]) {
                const file = values.resumeUpload[0];
                const base64File = await fileToBase64(file);
                resumeUrl = await uploadResume.mutateAsync({
                  fileName: file.name,
                  fileContent: base64File,
                });
              }

              updateHacker.mutate({
                ...values,
                id: hacker.id,
                resumeUrl,
              });
            } catch {
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
                  <Input type="text" placeholder="Lenny" {...field} />
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
                  <Input type="text" placeholder="Dragonson" {...field} />
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
                    — <i>Optional</i>
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
                  Date of Birth <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="!mt-10">
            <h3 className="text-lg font-medium">Demographic Information</h3>
            <p className="text-sm text-muted-foreground">
              This is some additional information about you.
            </p>
          </div>
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Gender
                  <span className="text-gray-400">
                    {" "}
                    — <i>Optional</i>
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
                    — <i>Optional</i>
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
                      {RACES_OR_ETHNICITIES.map((race) => (
                        <SelectItem key={race} value={race}>
                          {race}
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
                      {LEVELS_OF_STUDY.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
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
                    buttonPlaceholder={hacker.school}
                    inputPlaceholder="Search for your school"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="major"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Major of Study <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <ResponsiveComboBox
                    items={MAJORS}
                    renderItem={(major) => <div>{major}</div>}
                    getItemValue={(major) => major}
                    getItemLabel={(major) => major}
                    onItemSelect={(major) => field.onChange(major)}
                    buttonPlaceholder={hacker.major}
                    inputPlaceholder="Search for your major"
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
            <h3 className="text-lg font-medium">Hackathon Survey</h3>
            <p className="text-sm text-muted-foreground">
              Tell us a bit more about yourself!
            </p>
          </div>
          <FormField
            control={form.control}
            name="survey1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Why do you want to attend Knighthacks?{" "}
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Why do you want to attend KnightHacks?"
                    {...field}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="survey2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  What do you hope to achieve at Knighthacks?{" "}
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What are your goals at this hackathon?"
                    {...field}
                    value={field.value}
                  />
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
          <FormField
            control={form.control}
            name="githubProfileUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  GitHub Profile
                  <span className="text-gray-400">
                    {" "}
                    — <i>Optional</i>
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
                  LinkedIn Profile
                  <span className="text-gray-400">
                    {" "}
                    — <i>Optional</i>
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
                    — <i>Optional</i>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://knighthacks.org" {...field} />
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
                    — <i>Optional</i>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    {...fileRef}
                    onChange={(event) => {
                      field.onChange(
                        event.target.files?.[0]
                          ? event.target.files
                          : undefined,
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="foodAllergies"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>
                    Food Allergies/Restrictions
                    <span className="text-gray-400">
                      {" "}
                      — <i>Optional</i>
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex h-auto min-h-[3rem] w-full items-center justify-start space-x-2 px-3"
                        >
                          <span className="text-sm text-gray-400">
                            Select Allergies:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {selectedAllergies.length > 0 ? (
                              selectedAllergies.map((allergy) => (
                                <Badge
                                  key={allergy}
                                  variant="secondary"
                                  className="px-2 py-1 text-xs"
                                >
                                  {allergy}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400">
                                None selected
                              </span>
                            )}
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-full min-w-[var(--radix-popover-trigger-width)] max-w-none p-1"
                      >
                        <div className="flex w-full flex-col">
                          {ALLERGIES.map((allergy) => (
                            <div
                              key={allergy}
                              onClick={() => {
                                toggleAllergy(allergy);
                                field.onChange(allergiesRef.current.join(","));
                              }}
                              className="flex w-full cursor-pointer items-center space-x-2 rounded-md px-1 py-1 text-sm transition-colors hover:bg-gray-200 hover:text-black dark:hover:bg-gray-900 dark:hover:text-white"
                            >
                              <Checkbox
                                checked={selectedAllergies.includes(allergy)}
                                className="flex h-5 w-5 items-center justify-center [&>span>svg]:h-6 [&>span>svg]:w-6"
                              />
                              <span>{allergy}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="isFirstTime"
            render={({ field }) => (
              <FormItem className="flex flex-row space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    className="flex h-5 w-5 items-center justify-center [&>span>svg]:h-6 [&>span>svg]:w-6"
                  />
                </FormControl>
                <div className="flex items-center space-y-1 leading-none">
                  <FormLabel>
                    This is my first time participating in a hackathon
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agreesToMLHCodeOfConduct"
            render={({ field }) => (
              <FormItem className="flex flex-row space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    className="flex h-5 w-5 items-center justify-center [&>span>svg]:h-6 [&>span>svg]:w-6"
                  />
                </FormControl>
                <div className="flex items-center space-y-1 leading-none">
                  <FormLabel>
                    I have read and agree to the{" "}
                    <Link
                      href="https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      MLH Code of Conduct
                    </Link>
                    . <span className="text-destructive">*</span>
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agreesToMLHDataSharing"
            render={({ field }) => (
              <FormItem className="flex flex-row space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    className="flex h-5 w-5 items-center justify-center [&>span>svg]:h-6 [&>span>svg]:w-6"
                  />
                </FormControl>
                <div className="flex items-center space-y-1 leading-none">
                  <FormLabel>
                    I authorize you to share my application/registration
                    information with Major League Hacking for event
                    administration, ranking, and MLH administration in-line with
                    the{" "}
                    <Link
                      href="https://github.com/MLH/mlh-policies/blob/main/privacy-policy.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      MLH Privacy Policy
                    </Link>
                    . I further agree to the terms of both the{" "}
                    <Link
                      href="https://github.com/MLH/mlh-policies/blob/main/contest-terms.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      MLH Contest Terms and Conditions
                    </Link>{" "}
                    and the{" "}
                    <Link
                      href="https://github.com/MLH/mlh-policies/blob/main/privacy-policy.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      MLH Privacy Policy
                    </Link>
                    . <span className="text-destructive">*</span>
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agreesToReceiveEmailsFromMLH"
            render={({ field }) => (
              <FormItem className="flex flex-row space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    className="flex h-5 w-5 items-center justify-center [&>span>svg]:h-6 [&>span>svg]:w-6"
                  />
                </FormControl>
                <div className="flex items-center space-y-1 leading-none">
                  <FormLabel>
                    I authorize MLH to send me occasional emails about relevant
                    events, career opportunities, and community announcements
                  </FormLabel>
                </div>
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
        <DeleteHackerButton
          hackerId={hacker.id}
          firstName={hacker.firstName}
          lastName={hacker.lastName}
        />
      </div>
    </>
  );
}
