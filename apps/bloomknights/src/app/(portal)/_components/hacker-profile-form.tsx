"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { HackerProfileFormValues } from "@forge/hackathon/client";
import { FORMS } from "@forge/consts";
import { useHackerProfileFlow } from "@forge/hackathon/client";
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

export function HackerProfileForm() {
  const [loading, setLoading] = useState(false);
  const {
    dashboardQuery,
    participant: hacker,
    profileSchema,
    updateProfile,
    uploadResume,
  } = useHackerProfileFlow();

  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const allergiesRef = useRef<string[]>([]);

  const isError = dashboardQuery.isError;
  const isPending = dashboardQuery.isPending;

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

  const form = useForm<HackerProfileFormValues>({
    schema: profileSchema,
    defaultValues: {
      firstName: hacker?.firstName ?? "",
      lastName: hacker?.lastName ?? "",
      gender: hacker?.gender ?? undefined,
      raceOrEthnicity: hacker?.raceOrEthnicity ?? undefined,
      email: hacker?.email ?? "",
      phoneNumber: hacker?.phoneNumber ?? "",
      country: hacker?.country ?? undefined,
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
      email: hacker.email,
      phoneNumber: hacker.phoneNumber || "",
      country: hacker.country,
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

  if (isPending) {
    return (
      <div
        aria-live="polite"
        className="flex min-h-48 items-center justify-center gap-3 text-sm font-extrabold text-[#405c4a]"
      >
        <Loader2 className="size-5 animate-spin" />
        Loading your profile…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex min-h-48 items-center justify-center text-center font-semibold text-[#7d2056]"
      >
        Something went wrong. Please refresh and try again.
      </div>
    );
  }

  if (!hacker) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
        <p>You need a BloomKnights application before editing a profile.</p>
        <Button asChild className="rounded-lg bg-[#8f285f]">
          <Link href="/apply">Apply to BloomKnights</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Form {...form}>
        <form
          className="bk-profile-form grid gap-x-6 gap-y-5 md:grid-cols-2"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            setLoading(true);
            try {
              let resumeUrl = values.resumeUrl ?? hacker.resumeUrl ?? "";
              if (values.resumeUpload?.length && values.resumeUpload[0]) {
                const file = values.resumeUpload[0];
                const base64File = await fileToBase64(file);
                resumeUrl = await uploadResume(file.name, base64File);
              }

              await updateProfile({
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                dob: values.dob,
                phoneNumber: values.phoneNumber,
                country: values.country,
                school: values.school,
                major: values.major,
                levelOfStudy: values.levelOfStudy,
                gender: values.gender ?? "Prefer not to answer",
                gradDate: values.gradDate,
                raceOrEthnicity:
                  values.raceOrEthnicity ?? "Prefer not to answer",
                shirtSize: values.shirtSize,
                githubProfileUrl: values.githubProfileUrl,
                linkedinProfileUrl: values.linkedinProfileUrl,
                websiteUrl: values.websiteUrl,
                isFirstTime: values.isFirstTime,
                agreesToReceiveEmailsFromMLH:
                  values.agreesToReceiveEmailsFromMLH,
                agreesToMLHCodeOfConduct: values.agreesToMLHCodeOfConduct,
                agreesToMLHDataSharing: values.agreesToMLHDataSharing,
                survey1: values.survey1,
                survey2: values.survey2,
                foodAllergies: values.foodAllergies,
                resumeUrl,
              });
              toast.success("Profile updated!");
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Something went wrong while processing your changes.",
              );
            } finally {
              setLoading(false);
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
                    , <i>Optional</i>
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
          <div className="bk-profile-section-heading">
            <h2>About you</h2>
            <p>
              Demographic information helps us understand who BloomKnights
              serves.
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
                    , <i>Optional</i>
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
                    , <i>Optional</i>
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
          <div className="bk-profile-section-heading">
            <h2>Academic information</h2>
            <p>Your school, program, and expected graduation.</p>
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
                    items={FORMS.SCHOOLS}
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
                    items={FORMS.MAJORS}
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
          <div className="bk-profile-section-heading">
            <h2>Hackathon survey</h2>
            <p>Tell the organizer team what you want from the event.</p>
          </div>
          <FormField
            control={form.control}
            name="survey1"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
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
              <FormItem className="md:col-span-2">
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
          <div className="bk-profile-section-heading">
            <h2>Links and logistics</h2>
            <p>Share your work, resume, and dietary requirements.</p>
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
                    , <i>Optional</i>
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
                    , <i>Optional</i>
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
                    , <i>Optional</i>
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
                    , <i>Optional</i>
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
                      , <i>Optional</i>
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex h-auto min-h-12 w-full items-center justify-start space-x-2 px-3"
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
                        className="min-w-(--radix-popover-trigger-width) w-full max-w-none p-1"
                      >
                        <div className="flex w-full flex-col">
                          {FORMS.ALLERGIES.map((allergy) => (
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
              <FormItem className="bk-profile-consent flex flex-row space-x-3 space-y-0 md:col-span-2">
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
              <FormItem className="bk-profile-consent flex flex-row space-x-3 space-y-0 md:col-span-2">
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
              <FormItem className="bk-profile-consent flex flex-row space-x-3 space-y-0 md:col-span-2">
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
              <FormItem className="bk-profile-consent flex flex-row space-x-3 space-y-0 md:col-span-2">
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

          <Button
            type="submit"
            disabled={loading}
            className="min-h-12 rounded-lg bg-[#173b28] text-white hover:bg-[#24533a] md:col-span-2"
          >
            <span className="inline-flex size-4 items-center justify-center">
              {loading && <Loader2 className="size-4 animate-spin" />}
            </span>
            {loading ? "Saving changes" : "Save profile changes"}
          </Button>
        </form>
      </Form>
    </>
  );
}
