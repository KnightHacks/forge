"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { FORMS, MINIO } from "@forge/consts";
import { InsertHackerSchema } from "@forge/db/schemas/knight-hacks";
import { HACKATHON_TEMPLATE_IDS } from "@forge/email/client";
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

import { api } from "~/trpc/react";

export function HackerFormPage({
  hackathonId,
  hackathonName,
  hackathonStartDate,
}: {
  hackathonId: string;
  hackathonName: string;
  hackathonStartDate: string;
}) {
  const router = useRouter();
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [comboBoxKey, setComboBoxKey] = useState(0);
  const [tosAccepted, setTosAccepted] = useState(false);
  const utils = api.useUtils();

  // Get previous hacker profile to pre-fill form
  const { data: previousHacker } = api.hackathon.getPreviousHacker.useQuery();

  const uploadResume = api.resume.uploadResume.useMutation({
    onError() {
      toast.error("There was a problem storing your resume, please try again!");
    },
    async onSettled() {
      await utils.resume.invalidate();
    },
  });

  const createHacker = api.hacker.createHacker.useMutation({
    onSuccess() {
      toast.success("Application submitted successfully!");
      // user gets sent back to homepage upon successful form submission
      router.push("/dashboard");
      router.refresh();
    },
    onError() {
      toast.error("Oops! Something went wrong. Please try again later.");
    },
    onSettled() {
      setLoading(false);
    },
  });

  const sendEmail = api.email.sendEmail.useMutation();

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) => {
      const next = prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy];

      form.setValue("foodAllergies", next.join(","));
      return next;
    });
  };

  // Helper function to calculate age
  const calculateAge = (birthDate: Date, referenceDate: Date): number => {
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  // Setup React Hook Form
  const form = useForm({
    schema: InsertHackerSchema.extend({
      userId: z.undefined(),
      firstName: z.string().min(1, "Required"),
      lastName: z.string().min(1, "Required"),
      age: z.undefined(),
      email: z.string().email("Invalid email").min(1, "Required"),
      phoneNumber: z
        .string()
        .regex(/^\d{10}|\d{3}-\d{3}-\d{4}$|^$/, "Invalid phone number"),
      country: z.string().min(1, "Required"),
      dob: z
        .string()
        .pipe(z.coerce.date())
        .refine(
          (date) => {
            const hackathonDate = new Date(hackathonStartDate);
            const age = calculateAge(date, hackathonDate);

            return age >= 18;
          },
          {
            message:
              "You must be at least 18 years old by the hackathon start date to participate",
          },
        )
        .transform((date) => date.toISOString()),
      gradDate: z
        .string()
        .pipe(z.coerce.date())
        .transform((date) => date.toISOString()),
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
              if (fileList[0].size > MINIO.MAX_RESUME_SIZE) {
                ctx.addIssue({
                  code: z.ZodIssueCode.too_big,
                  type: "number",
                  maximum: MINIO.MAX_RESUME_SIZE,
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
      agreesToMLHCodeOfConduct: z.boolean().refine((val) => val === true, {
        message: "You must agree to the MLH Code of Conduct",
      }),
      agreesToMLHDataSharing: z.boolean().refine((val) => val === true, {
        message: "You must agree to the MLH data sharing terms",
      }),
    }),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: undefined,
      discordUser: "",
      email: "",
      phoneNumber: "",
      country: undefined,
      school: undefined,
      levelOfStudy: undefined,
      shirtSize: undefined,
      githubProfileUrl: "",
      linkedinProfileUrl: "",
      websiteUrl: "",
      resumeUrl: "",
      dob: "",
      gradDate: "",
      survey1: "",
      survey2: "",
      isFirstTime: false,
      foodAllergies: "",
      agreesToReceiveEmailsFromMLH: false,
      agreesToMLHCodeOfConduct: false,
      agreesToMLHDataSharing: false,
    },
  });

  const fileRef = form.register("resumeUpload");

  useEffect(() => {
    if (previousHacker) {
      form.reset({
        firstName: previousHacker.firstName,
        lastName: previousHacker.lastName,
        gender: previousHacker.gender,
        raceOrEthnicity: previousHacker.raceOrEthnicity,
        discordUser: previousHacker.discordUser,
        email: previousHacker.email,
        phoneNumber: previousHacker.phoneNumber ?? undefined,
        country: previousHacker.country,
        school: previousHacker.school,
        levelOfStudy: previousHacker.levelOfStudy,
        shirtSize: previousHacker.shirtSize,
        githubProfileUrl: previousHacker.githubProfileUrl ?? undefined,
        linkedinProfileUrl: previousHacker.linkedinProfileUrl ?? undefined,
        websiteUrl: previousHacker.websiteUrl ?? undefined,
        resumeUrl: previousHacker.resumeUrl, // Keep existing resume URL
        dob: previousHacker.dob,
        gradDate: previousHacker.gradDate,
        survey1: "", // Keep survey answers empty for new applications
        survey2: "", // Keep survey answers empty for new applications
        isFirstTime: previousHacker.isFirstTime,
        foodAllergies: previousHacker.foodAllergies,
        agreesToReceiveEmailsFromMLH:
          previousHacker.agreesToReceiveEmailsFromMLH,
        agreesToMLHCodeOfConduct: false, // Always require fresh consent
        agreesToMLHDataSharing: false, // Always require fresh consent
      });

      // Set selected allergies for the UI
      if (previousHacker.foodAllergies) {
        const allergies = previousHacker.foodAllergies.split(",");
        setSelectedAllergies(allergies);
      }

      // Force ResponsiveComboBox components to re-render with new values
      setComboBoxKey((prev) => prev + 1);
    }
  }, [previousHacker, form]);

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

  return (
    <Form {...form}>
      <form
        className="mx-auto my-4 flex h-full w-full flex-col space-y-3 overflow-y-auto rounded-md border p-4 md:my-8 md:w-1/2"
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          setLoading(true);

          if (!tosAccepted) {
            toast.error("Please Accept the Knight Hacks Terms of Service");
            setLoading(false);
            return;
          }

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

            createHacker.mutate({
              firstName: values.firstName,
              lastName: values.lastName,
              email: values.email,
              dob: values.dob,
              phoneNumber: values.phoneNumber,
              country: values.country as (typeof FORMS.COUNTRIES)[number],
              school: values.school,
              major: values.major,
              levelOfStudy: values.levelOfStudy,
              gender: values.gender ?? "Prefer not to answer",
              gradDate: values.gradDate,
              raceOrEthnicity: values.raceOrEthnicity ?? "Prefer not to answer",
              shirtSize: values.shirtSize,
              githubProfileUrl: values.githubProfileUrl,
              linkedinProfileUrl: values.linkedinProfileUrl,
              websiteUrl: values.websiteUrl,
              isFirstTime: values.isFirstTime,
              agreesToReceiveEmailsFromMLH: values.agreesToReceiveEmailsFromMLH,
              agreesToMLHCodeOfConduct: values.agreesToMLHCodeOfConduct,
              agreesToMLHDataSharing: values.agreesToMLHDataSharing,
              survey1: values.survey1,
              survey2: values.survey2,
              foodAllergies: values.foodAllergies,
              resumeUrl,
              hackathonName: hackathonId,
            });

            sendEmail.mutate({
              from: "donotreply@knighthacks.org",
              to: values.email,
              subject: "Knight Hacks VIII - We recieved your application!",
              template_id: HACKATHON_TEMPLATE_IDS.Apply,
              data: {
                name: values.firstName,
                hackathon: hackathonName,
              },
            });
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Error uploading resume or creating hacker:", error);
            toast.error(
              "Something went wrong while processing your application.",
            );
          }
        })}
      >
        <h1 className="text-2xl font-bold">
          {hackathonName} Hacker Registration
        </h1>
        <p className="text-sm text-gray-400">
          <i>Fill out this form to apply to the Hackathon!</i>
        </p>
        {previousHacker && (
          <div className="rounded-md bg-blue-50 p-4 dark:bg-purple-900/20">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  Information Pre-filled
                </h3>
                <div className="mt-2 text-sm text-purple-700 dark:text-purple-300">
                  <p>
                    We've pre-filled this form with information from your
                    previous hackathon application. Please review and update any
                    information as needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
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
                Date of Birth <span className="text-destructive">*</span>
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
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Country of Residence <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <ResponsiveComboBox
                  key={`country-${comboBoxKey}-${field.value || "empty"}`}
                  items={FORMS.COUNTRIES}
                  renderItem={(country) => <div>{country}</div>}
                  getItemValue={(country) => country}
                  getItemLabel={(country) => country}
                  onItemSelect={(country) => field.onChange(country)}
                  buttonPlaceholder={field.value || "Select your country"}
                  inputPlaceholder="Search for your country"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FORMS.GENDERS.map((gender) => (
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your race or ethnicity" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FORMS.RACES_OR_ETHNICITIES.map((race) => (
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
          name="levelOfStudy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Level of Study <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level of study" />
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
                  key={`school-${comboBoxKey}-${field.value}`}
                  items={FORMS.SCHOOLS}
                  renderItem={(school) => <div>{school}</div>}
                  getItemValue={(school) => school}
                  getItemLabel={(school) => school}
                  onItemSelect={(school) => field.onChange(school)}
                  buttonPlaceholder={field.value}
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
                  key={`major-${comboBoxKey}-${field.value}`}
                  items={FORMS.MAJORS}
                  renderItem={(major) => <div>{major}</div>}
                  getItemValue={(major) => major}
                  getItemLabel={(major) => major}
                  onItemSelect={(major) => field.onChange(major)}
                  buttonPlaceholder={field.value}
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
        <FormField
          control={form.control}
          name="shirtSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Shirt Size <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your shirt size" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FORMS.SHIRT_SIZES.map((size) => (
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
        <FormField
          control={form.control}
          name="survey1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Why do you want to attend {hackathonName}?{" "}
                <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Why do you want to attend?"
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
                What do you hope to achieve at {hackathonName}?{" "}
                <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What are your goals for this event?"
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
                LinkedIn Profile
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
                  {...fileRef}
                  onChange={(event) => {
                    field.onChange(
                      event.target.files?.[0] ? event.target.files : undefined,
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
          render={() => {
            return (
              <FormItem>
                <FormLabel>
                  Food Allergies/Restrictions
                  <span className="text-gray-400">
                    {" "}
                    &mdash; <i>Optional</i>
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
                        {FORMS.ALLERGIES.map((allergy) => (
                          <div
                            key={allergy}
                            onClick={() => {
                              toggleAllergy(allergy);
                            }}
                            className="flex w-full cursor-pointer items-center space-x-2 rounded-md px-1 py-1 text-sm transition-colors hover:bg-gray-200 hover:text-black dark:hover:bg-gray-900 dark:hover:text-white"
                          >
                            <Checkbox
                              checked={selectedAllergies.includes(allergy)}
                              onCheckedChange={() => toggleAllergy(allergy)}
                              className="flex h-5 w-5 items-center justify-center [&>span>svg]:h-6 [&>span>svg]:w-6"
                              onClick={() => toggleAllergy(allergy)}
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
                  This is my first time participating in a Hackathon.
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
                  events, career opportunities, and community announcements.
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="flex flex-row space-x-3 space-y-0 py-2">
          <div>
            <Checkbox
              checked={tosAccepted}
              onCheckedChange={(v) => setTosAccepted(!!v)}
              className="flex h-5 w-5 items-center justify-center [&>span>svg]:h-6 [&>span>svg]:w-6"
              aria-labelledby="tos-visual-label"
            />
          </div>

          <div className="space-y-1 leading-none">
            <div id="tos-visual-label" className="text-sm font-medium">
              By checking this box you acknowledge that you agree to the{" "}
              <Link
                href="https://knight-hacks.notion.site/kh-25-tos"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 underline underline-offset-4 hover:no-underline"
              >
                Knight Hacks Terms of Service
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <Button type="submit">Submit</Button>
        )}
      </form>
    </Form>
  );
}
