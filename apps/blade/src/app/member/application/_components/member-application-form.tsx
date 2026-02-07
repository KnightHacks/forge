"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import {
  ALLOWED_PROFILE_PICTURE_EXTENSIONS,
  ALLOWED_PROFILE_PICTURE_TYPES,
  FORMS,
  GradTerm,
  KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE,
  KNIGHTHACKS_MAX_RESUME_SIZE,
  TERM_TO_DATE,
} from "@forge/consts";
import { InsertMemberSchema } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export function MemberApplicationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { data: otherCompaniesObj } = api.companies.getCompanies.useQuery();
  const otherCompanies = otherCompaniesObj
    ? otherCompaniesObj.map((c) => c.name)
    : [];

  const createMember = api.member.createMember.useMutation({
    onSuccess() {
      toast.success("Application submitted successfully!");
      router.push("/dashboard");
      router.refresh();
    },
    onError(error) {
      if (
        /duplicate key value violates unique constraint/i.test(error.message)
      ) {
        toast.error("A member with this info already exists");
      } else {
        toast.error(`Application submission failed ${error.message}`);
      }
    },
    onSettled() {
      setLoading(false);
    },
  });

  const uploadResume = api.resume.uploadResume.useMutation({
    onError(error) {
      toast.error(`Resume upload failed: ${error.message}`);
    },
  });

  const uploadProfilePicture = api.guild.uploadProfilePicture.useMutation({
    onError(error) {
      toast.error(`Profile picture upload failed: ${error.message}`);
    },
  });

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

  const form = useForm({
    schema: InsertMemberSchema.omit({
      discordUser: true,
      userId: true,
      age: true,
      id: true,
      points: true,
      dateCreated: true,
      timeCreated: true,
      gradDate: true,
      profilePictureUrl: true,
    }).extend({
      userId: z.undefined(),
      age: z.undefined(),
      firstName: z.string().min(1, "Required"),
      lastName: z.string().min(1, "Required"),
      email: z.string().email("Invalid email").min(1, "Required"),
      phoneNumber: z
        .string()
        .regex(/^\d{10}|\d{3}-\d{3}-\d{4}$|^$/, "Invalid phone number")
        .optional()
        .or(z.literal("")), // Allow empty string, will be converted to null
      dob: z
        .string()
        .min(1, "Date of birth is required.")
        .pipe(z.coerce.date())
        .refine(
          (date) => {
            const today = new Date();
            const age = calculateAge(date, today);
            return age >= 16;
          },
          {
            message: "You must be at least 16 years old to join Knight Hacks",
          },
        )
        .transform((date) => date.toISOString()),
      gradTerm: z.enum(["Spring", "Summer", "Fall"]),
      gradYear: z
        .string()
        .regex(/^\d{4}$/, "Year must be 4 digits")
        .transform(Number)
        .refine((y) => y >= 1900 && y <= 2100, "Year out of range"),
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
          if (fileList.length > 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Only 0 or 1 resume allowed",
            });
          }
          if (fileList.length === 1) {
            const file = fileList[0];
            if (file instanceof File) {
              const fileExtension = file.name.split(".").pop()?.toLowerCase();
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
                  message: "File too large: maximum 5MB",
                });
              }
            } else {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Resume file object is invalid",
              });
            }
          }
        })
        .optional(),
      guildProfileVisible: z.boolean().optional(),
      tagline: z
        .string()
        .max(80, "Tagline must be 80 characters or less")
        .optional(),
      about: z
        .string()
        .max(500, "About section must be 500 characters or less")
        .optional(),
      profilePictureUpload: z
        .instanceof(FileList)
        .superRefine((fileList, ctx) => {
          if (fileList.length > 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Only one profile picture is allowed",
            });
          }
          if (fileList.length === 1) {
            const file = fileList[0];
            if (file instanceof File) {
              if (!ALLOWED_PROFILE_PICTURE_TYPES.includes(file.type)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Invalid file type. Allowed: ${ALLOWED_PROFILE_PICTURE_EXTENSIONS.join(", ")}`,
                });
              }
              if (file.size > KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE) {
                ctx.addIssue({
                  code: z.ZodIssueCode.too_big,
                  type: "number",
                  maximum: KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE,
                  inclusive: true,
                  message: `File too large: maximum ${KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE / (1024 * 1024)}MB`,
                });
              }
            } else {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Profile picture file object is invalid",
              });
            }
          }
        })
        .optional(),
    }),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      dob: "",
      gradTerm: "Spring",
      gradYear: (new Date().getFullYear() + 1).toString(),
      githubProfileUrl: "",
      linkedinProfileUrl: "",
      websiteUrl: "",
      guildProfileVisible: true,
      tagline: "",
      about: "",
      resumeUrl: "",
    },
  });

  const fileRef = form.register("resumeUpload");
  const profilePictureFileRef = form.register("profilePictureUpload");

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
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

  const [showOtherCompany, setShowOtherCompany] = useState(false);

  return (
    <Form {...form}>
      <form
        className="mx-auto my-4 flex h-full w-full flex-col space-y-3 overflow-y-auto rounded-md border p-4 md:my-8 md:w-1/2"
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          setLoading(true);

          try {
            let finalResumeUrl = values.resumeUrl ?? ""; // Use existing URL from defaults if any, or empty
            if (values.resumeUpload?.length && values.resumeUpload[0]) {
              const file = values.resumeUpload[0];
              const base64File = await fileToBase64(file);
              const uploadResult = await uploadResume.mutateAsync({
                fileName: file.name,
                fileContent: base64File,
              });
              finalResumeUrl = uploadResult; // uploadResume from api.resume.uploadResume returns the path/URL string
            }

            let finalProfilePictureUrl = ""; // Initialize
            if (
              values.profilePictureUpload?.length &&
              values.profilePictureUpload[0]
            ) {
              const file = values.profilePictureUpload[0];
              const base64File = await fileToBase64(file);

              // The following line might show ESLint errors if tRPC types are not correctly synced.
              // Ensure backend `memberRouter` is updated and client types are regenerated.
              const uploadResult = await uploadProfilePicture.mutateAsync({
                fileName: file.name,
                fileContent: base64File,
              });

              if (typeof uploadResult.profilePictureUrl === "string") {
                finalProfilePictureUrl = uploadResult.profilePictureUrl;
              }
            }

            const { month, day } = TERM_TO_DATE[values.gradTerm];
            const gradDateIso = new Date(
              Number(values.gradYear),
              month,
              day,
            ).toISOString();

            const createMemberPayload = {
              firstName: values.firstName,
              lastName: values.lastName,
              email: values.email,
              dob: values.dob,
              school: values.school,
              major: values.major,
              phoneNumber:
                values.phoneNumber === "" ? undefined : values.phoneNumber,
              levelOfStudy: values.levelOfStudy,
              gender: values.gender ?? "Prefer not to answer",
              gradDate: gradDateIso,
              company: values.company,
              raceOrEthnicity: values.raceOrEthnicity ?? "Prefer not to answer",
              shirtSize: values.shirtSize,
              githubProfileUrl: values.githubProfileUrl || undefined,
              linkedinProfileUrl: values.linkedinProfileUrl || undefined,
              websiteUrl: values.websiteUrl || undefined,
              resumeUrl: finalResumeUrl || undefined,
              guildProfileVisible: values.guildProfileVisible ?? true,
              tagline: values.tagline || undefined,
              about: values.about || undefined,
              profilePictureUrl: finalProfilePictureUrl || undefined,
            };

            await createMember.mutateAsync(createMemberPayload);
          } catch {
            setLoading(false);
          }
        })}
      >
        <h1 className="text-2xl font-bold">Membership Application Form</h1>
        <p className="text-sm text-gray-400">
          <i>
            Note: this application is for membership of Knight Hacks the{" "}
            <span className="italic underline">organization</span> - NOT the
            Hackathon.
          </i>
        </p>

        <h2 className="pt-6 text-xl font-bold">Personal Information</h2>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FORMS.GENDERS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your race or ethnicity" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FORMS.RACES_OR_ETHNICITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your shirt size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FORMS.SHIRT_SIZES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <h2 className="pt-6 text-xl font-bold">Academic Information</h2>
        <FormField
          control={form.control}
          name="levelOfStudy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Level of Study <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your level of study" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FORMS.LEVELS_OF_STUDY.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  items={FORMS.SCHOOLS}
                  renderItem={(item) => <div>{item}</div>}
                  getItemValue={(item) => item}
                  getItemLabel={(item) => item}
                  onItemSelect={(value) => field.onChange(value)}
                  buttonPlaceholder="Select your school"
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
                  items={FORMS.MAJORS}
                  renderItem={(item) => <div>{item}</div>}
                  getItemValue={(item) => item}
                  getItemLabel={(item) => item}
                  onItemSelect={(value) => field.onChange(value)}
                  buttonPlaceholder="Select your major"
                  inputPlaceholder="Search for your major"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gradTerm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Graduation Term <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a term" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(["Spring", "Summer", "Fall"] as GradTerm[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gradYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Graduation Year <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1900"
                  max="2100"
                  placeholder="2026"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <h2 className="pt-6 text-xl font-bold">
          Current/most recent employment
        </h2>
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Current Company
                <span className="text-gray-400">
                  {" "}
                  &mdash; <i>Optional</i>
                </span>
              </FormLabel>
              <FormControl>
                <ResponsiveComboBox
                  items={[...FORMS.COMPANIES, ...otherCompanies, "Other"]}
                  renderItem={(item) => <div>{item}</div>}
                  getItemValue={(item) => item}
                  getItemLabel={(item) => item}
                  onItemSelect={(value) => {
                    if (value === "Other") {
                      setShowOtherCompany(true);
                      field.onChange("");
                    } else {
                      setShowOtherCompany(false);
                      field.onChange(value);
                    }
                  }}
                  buttonPlaceholder="Select your company"
                  inputPlaceholder="Search for your company"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {showOtherCompany && (
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Other Company</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Your Company"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <h2 className="pt-6 text-xl font-bold">
          Guild Profile Customization - (Optional)
        </h2>
        <p className="text-sm text-gray-400">
          Personalize how you appear on the Knight Hacks{" "}
          <Link
            href={"https://guild.knighthacks.org"}
            className="italic underline hover:text-gray-100"
          >
            Guild
          </Link>{" "}
          collective. This information helps others connect with you and learn
          more about your interests and skills, and every field is optional.
        </p>

        <FormField
          control={form.control}
          name="guildProfileVisible"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Profile Visibility</FormLabel>
                <FormDescription>
                  Make your Guild profile visible to other Knight Hacks members.
                </FormDescription>
              </div>
              <FormControl className="flex h-full items-center">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="profilePictureUpload"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Picture</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept={ALLOWED_PROFILE_PICTURE_TYPES.join(",")}
                  {...profilePictureFileRef}
                  onChange={(event) =>
                    field.onChange(
                      event.target.files?.[0] ? event.target.files : undefined,
                    )
                  }
                />
              </FormControl>
              <FormDescription>
                Upload a square picture (JPG, PNG, GIF, WEBP). Max{" "}
                {KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE / (1024 * 1024)}MB.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tagline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tagline / Short Bio</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Aspiring Innovator | Knight Hacks Organizer"
                  {...field}
                  maxLength={80}
                />
              </FormControl>
              <FormDescription>
                A brief (max 80 chars) intro. Visible in member listings. Be
                creative!
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="about"
          render={({ field }) => (
            <FormItem>
              <FormLabel>About Me</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share more about your interests, projects, skills..."
                  {...field}
                  maxLength={500}
                  rows={5}
                />
              </FormControl>
              <FormDescription>
                Elaborate a bit (max 500 chars). This appears on your detailed
                Guild profile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <h3 className="pt-4 text-lg font-medium">Links</h3>
          <p className="mt-1 text-sm text-gray-400">
            Share your professional and project links.
          </p>
        </div>
        <FormField
          control={form.control}
          name="githubProfileUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GitHub Profile</FormLabel>
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
              <FormLabel>LinkedIn Profile</FormLabel>
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
              <FormLabel>Personal Website</FormLabel>
              <FormControl>
                <Input placeholder="https://knighthacks.org" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <h2 className="pt-6 text-lg font-bold">Resume</h2>
        <FormField
          control={form.control}
          name="resumeUpload"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Upload Resume</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".pdf"
                  {...fileRef}
                  onChange={(event) =>
                    field.onChange(
                      event.target.files?.[0] ? event.target.files : undefined,
                    )
                  }
                />
              </FormControl>
              <FormDescription>
                PDF format only, max 5MB. May be shared with sponsors.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <Button type="submit" className="w-full md:w-auto">
            Submit Application
          </Button>
        )}
      </form>
    </Form>
  );
}
