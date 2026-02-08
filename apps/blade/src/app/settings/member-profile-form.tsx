"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { FORMS, MINIO } from "@forge/consts";
import { InsertMemberSchema } from "@forge/db/schemas/knight-hacks";
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
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Separator } from "@forge/ui/separator";
import { Textarea } from "@forge/ui/textarea";
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

  const { data: otherCompaniesObj } = api.companies.getCompanies.useQuery();
  const otherCompanies = otherCompaniesObj
    ? otherCompaniesObj.map((c) => c.name)
    : [];

  const { data: member, isError } = api.member.getMember.useQuery(undefined, {
    initialData: data,
  });

  const [showOtherCompany, setShowOtherCompany] = useState(
    member?.company &&
      !(FORMS.COMPANIES as readonly string[]).includes(member.company),
  );

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

  const uploadProfilePicture = api.guild.uploadProfilePicture.useMutation({
    onError() {
      toast.error("There was a problem uploading your profile picture!");
    },
    async onSettled() {
      await utils.member.getMember.invalidate();
    },
  });

  const initTermYear = (() => {
    if (!member?.gradDate)
      return { term: "Spring", year: `${new Date().getFullYear() + 1}` };
    const d = new Date(member.gradDate);
    const m = d.getUTCMonth();
    const term = m === 4 ? "Spring" : m === 7 ? "Summer" : "Fall"; // based on fixed months
    return { term, year: String(d.getUTCFullYear()) };
  })();

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
      age: true,
      userId: true,
      gradDate: true,
    }).extend({
      firstName: z.string().min(1, "Required"),
      lastName: z.string().min(1, "Required"),
      age: z.undefined(),
      email: z.string().email("Invalid email").min(1, "Required"),
      phoneNumber: z
        .string()
        .regex(/^\d{10}|\d{3}-\d{3}-\d{4}$|^$/, "Invalid phone number")
        .optional()
        .or(z.literal("")),
      resumeUpload: z
        .instanceof(FileList)
        .superRefine((fileList, ctx) => {
          if (fileList.length > 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Only 0 or 1 files allowed",
            });
          }
          if (fileList.length === 1) {
            const file = fileList[0];
            if (file instanceof File) {
              const ext = file.name.split(".").pop()?.toLowerCase();
              if (ext !== "pdf") {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Resume must be a PDF",
                });
              }
              if (file.size > MINIO.MAX_RESUME_SIZE) {
                ctx.addIssue({
                  code: z.ZodIssueCode.too_big,
                  type: "number",
                  maximum: MINIO.MAX_RESUME_SIZE,
                  inclusive: true,
                  message: "File too large: maximum 5MB",
                });
              }
            }
          }
        })
        .optional(),
      profilePictureUpload: z
        .instanceof(FileList)
        .superRefine((fileList, ctx) => {
          if (fileList.length > 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Only one profile picture allowed",
            });
          }
          if (fileList.length === 1) {
            const file = fileList[0];
            if (file instanceof File) {
              if (!MINIO.ALLOWED_PROFILE_PICTURE_TYPES.includes(file.type)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Invalid file type. Allowed: ${MINIO.ALLOWED_PROFILE_PICTURE_EXTENSIONS.join(", ")}`,
                });
              }
              if (file.size > MINIO.KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE) {
                ctx.addIssue({
                  code: z.ZodIssueCode.too_big,
                  type: "number",
                  maximum: MINIO.KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE,
                  inclusive: true,
                  message: `File too large: maximum ${MINIO.KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE / (1024 * 1024)}MB`,
                });
              }
            }
          }
        })
        .optional(),
      dob: z
        .string()
        .pipe(z.coerce.date())
        .refine(
          (date) => {
            const today = new Date();
            const age = calculateAge(date, today);
            return age >= 16;
          },
          {
            message:
              "You must be at least 16 years old to be a Knight Hacks member",
          },
        )
        .transform((date) => date.toISOString()),
      gradTerm: z.enum(["Spring", "Summer", "Fall"]),
      gradYear: z
        .string()
        .regex(/^\d{4}$/, "Enter a 4‑digit year")
        .transform(Number),
      githubProfileUrl: z
        .string()
        .regex(/^https:\/\/.+/, "Invalid URL")
        .regex(/^https:\/\/(www\.)?github\.com\/.+/, "Invalid URL")
        .url({ message: "Invalid URL" })
        .optional()
        .or(z.literal("")),
      linkedinProfileUrl: z
        .string()
        .regex(/^https:\/\/.+/, "Invalid URL")
        .regex(/^https:\/\/(www\.)?linkedin\.com\/.+/, "Invalid URL")
        .url({ message: "Invalid URL" })
        .optional()
        .or(z.literal("")),
      websiteUrl: z
        .string()
        .regex(/^https?:\/\/.+/, "Invalid URL")
        .url({ message: "Invalid URL" })
        .optional()
        .or(z.literal("")),
      guildProfileVisible: z.boolean().optional(),
      tagline: z
        .string()
        .max(80, "Tagline must be 80 characters or less")
        .optional(),
      about: z
        .string()
        .max(500, "About section must be 500 characters or less")
        .optional(),
    }),
    defaultValues: {
      firstName: member?.firstName,
      lastName: member?.lastName,
      email: member?.email ?? "",
      phoneNumber: member?.phoneNumber ?? "",
      dob: member?.dob,
      gradTerm: initTermYear.term as FORMS.GradTerm,
      gradYear: initTermYear.year,
      company: member?.company,
      githubProfileUrl: member?.githubProfileUrl ?? "",
      linkedinProfileUrl: member?.linkedinProfileUrl ?? "",
      websiteUrl: member?.websiteUrl ?? "",
      gender: member?.gender,
      levelOfStudy: member?.levelOfStudy,
      major: member?.major,
      raceOrEthnicity: member?.raceOrEthnicity,
      shirtSize: member?.shirtSize,
      school: member?.school,
      discordUser: member?.discordUser,
      guildProfileVisible: member?.guildProfileVisible ?? true,
      tagline: member?.tagline ?? "",
      about: member?.about ?? "",
    },
  });

  const resumeRef = form.register("resumeUpload");
  const pictureRef = form.register("profilePictureUpload");

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert file to Base64"));
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
              let resumeUrl = member.resumeUrl ?? "";
              if (values.resumeUpload?.length && values.resumeUpload[0]) {
                const file = values.resumeUpload[0];
                const base64File = await fileToBase64(file);
                resumeUrl = await uploadResume.mutateAsync({
                  fileName: file.name,
                  fileContent: base64File,
                });
              }

              let profilePictureUrl = member.profilePictureUrl ?? "";
              if (
                values.profilePictureUpload?.length &&
                values.profilePictureUpload[0]
              ) {
                const file = values.profilePictureUpload[0];
                const base64File = await fileToBase64(file);
                const result = await uploadProfilePicture.mutateAsync({
                  fileName: file.name,
                  fileContent: base64File,
                });
                profilePictureUrl = result.profilePictureUrl;
              }
              const termKey = values.gradTerm;
              const { month, day } = FORMS.TERM_TO_DATE[termKey];

              const year = Number(values.gradYear);
              const gradDateIso = new Date(year, month, day).toISOString();

              updateMember.mutate({
                id: member.id,
                ...values,
                resumeUrl,
                profilePictureUrl,
                phoneNumber:
                  values.phoneNumber === "" ? null : values.phoneNumber,
                gradDate: gradDateIso,
              });
            } catch {
              toast.error(
                "Something went wrong while processing your changes.",
              );
            }
          })}
        >
          <h2 className="text-xl font-bold">Personal Information</h2>
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
                      {FORMS.RACES_OR_ETHNICITIES.map((raceOrEthnicity) => (
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
                      {FORMS.LEVELS_OF_STUDY.map((levelOfStudy) => (
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
                    items={FORMS.SCHOOLS}
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
            name="major"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Major of Study <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <ResponsiveComboBox
                    items={FORMS.MAJORS}
                    renderItem={(major) => <div>{major}</div>}
                    getItemValue={(major) => major}
                    getItemLabel={(major) => major}
                    onItemSelect={(major) => field.onChange(major)}
                    buttonPlaceholder={member.major}
                    inputPlaceholder="Search for your major"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* New gradTerm ------------------------------------------- */}
          <FormField
            control={form.control}
            name="gradTerm"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>
                  Graduation Date <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a term" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(["Spring", "Summer", "Fall"] as FORMS.GradTerm[]).map(
                        (t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* New gradYear ------------------------------------------- */}
          <FormField
            control={form.control}
            name="gradYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Graduation Year</FormLabel>
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
                    buttonPlaceholder={
                      member.company &&
                      (FORMS.COMPANIES as readonly string[]).includes(
                        member.company,
                      )
                        ? member.company
                        : member.company
                          ? "Other"
                          : "Select your company"
                    }
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

          <div className="!mt-10">
            <h3 className="text-lg font-medium">Guild Profile Customization</h3>
            <p className="text-sm text-muted-foreground">
              Personalize how you appear on the Knight Hacks{" "}
              <Link
                className="underline hover:text-foreground"
                href={"https://guild.knighthacks.org"}
              >
                Guild
              </Link>{" "}
              collective.
            </p>
          </div>
          <Separator />
          <FormField
            control={form.control}
            name="guildProfileVisible"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <FormLabel className="text-base">Profile Visibility</FormLabel>
                <FormControl>
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
                    accept={MINIO.ALLOWED_PROFILE_PICTURE_TYPES.join(",")}
                    {...pictureRef}
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
                <FormMessage />
              </FormItem>
            )}
          />

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
                <FormLabel>Linkedin Profile</FormLabel>
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
          <FormField
            control={form.control}
            name="resumeUpload"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resume</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    placeholder=""
                    {...resumeRef}
                    onChange={(event) => {
                      field.onChange(
                        event.target.files?.[0]
                          ? event.target.files
                          : undefined,
                      );
                    }}
                  />
                </FormControl>
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
