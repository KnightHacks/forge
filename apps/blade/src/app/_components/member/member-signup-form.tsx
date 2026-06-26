"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  FileCheck2,
  GraduationCap,
  ImageIcon,
  Loader2,
  Sparkles,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";

import type {
  MemberFormValues,
  memberSignupFormDefinition,
} from "@forge/validators";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
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
import { Switch } from "@forge/ui/switch";
import { Textarea } from "@forge/ui/textarea";
import {
  MEMBER_CODE_OF_CONDUCT_URL,
  memberFormSchema,
} from "@forge/validators";

import { ResumePreview } from "~/app/_components/member/resume-preview";
import { useObjectPreviewUrl } from "~/hooks/use-object-preview-url";
import { api } from "~/trpc/react";

type SignupFormDefinition = typeof memberSignupFormDefinition;
type SignupField = SignupFormDefinition["fields"][number];
type SignupSection = SignupField["section"];

const sectionOrder: SignupSection[] = ["Personal", "Academics", "Guild"];
const MAX_RESUME_SIZE = 5 * 1000000;
const MAX_PROFILE_PICTURE_SIZE = 2 * 1024 * 1024;
const PROFILE_PICTURE_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const sectionMeta = {
  Personal: {
    icon: UserRound,
    title: "Your details",
    description: "The basics we use for membership records and check-in.",
  },
  Academics: {
    icon: GraduationCap,
    title: "Academics",
    description: "Academic context for club planning and member support.",
  },
  Guild: {
    icon: Sparkles,
    title: "Guild profile",
    description: (
      <>
        Guild is the Knight Hacks member directory for profiles, links, and
        recruiting context.{" "}
        <a
          href="https://guild.knighthacks.org"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          Open Guild
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </>
    ),
  },
} satisfies Record<
  SignupSection,
  { description: ReactNode; icon: typeof UserRound; title: string }
>;

function RevealOnView({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        setIsVisible(true);
        observer.disconnect();
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.14,
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition duration-500 ease-out motion-reduce:transition-none",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        className,
      )}
      style={{ transitionDelay: isVisible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

function getDefaultValues(): MemberFormValues {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dob: "",
    school: "",
    levelOfStudy: "",
    major: "",
    gender: "Prefer not to answer",
    raceOrEthnicity: "Prefer not to answer",
    shirtSize: "",
    gradTerm: "Spring",
    gradYear: new Date().getFullYear() + 1,
    company: "",
    githubProfileUrl: "",
    linkedinProfileUrl: "",
    websiteUrl: "",
    profilePictureUrl: "",
    resumeUrl: "",
    tagline: "",
    about: "",
    guildProfileVisible: true,
    codeOfConductAccepted: false,
  };
}

function fileToDataUrl(file: File, errorMessage: string) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(errorMessage));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error(errorMessage));
    };
    reader.readAsDataURL(file);
  });
}

const ResumeUploadControl = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<"div">, "onChange"> & {
    onChange: (value: string) => void;
    value?: string;
  }
>(({ className, onChange, value, ...props }, ref) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewFile] = useObjectPreviewUrl();
  const uploadResume = api.resume.uploadResume.useMutation({
    onError(error) {
      setUploadError(error.message || "Resume upload failed.");
      setPreviewFile(null);
      onChange("");
    },
  });

  const handleFile = async (file: File | undefined) => {
    setUploadError(null);

    if (!file) {
      setFileName(null);
      setPreviewFile(null);
      onChange("");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (file.type !== "application/pdf" && extension !== "pdf") {
      setUploadError("Resume must be a PDF.");
      setFileName(null);
      setPreviewFile(null);
      onChange("");
      return;
    }

    if (file.size > MAX_RESUME_SIZE) {
      setUploadError("Resume must be 5MB or smaller.");
      setFileName(null);
      setPreviewFile(null);
      onChange("");
      return;
    }

    setFileName(file.name);
    setPreviewFile(file);
    try {
      const fileContent = await fileToDataUrl(
        file,
        "Resume could not be read.",
      );
      const objectName = await uploadResume.mutateAsync({
        fileContent,
        fileName: file.name,
      });
      onChange(objectName);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Resume upload failed.",
      );
      setFileName(null);
      setPreviewFile(null);
      onChange("");
    }
  };

  return (
    <div ref={ref} className={cn("space-y-3", className)} {...props}>
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-primary/40 bg-background/70 px-4 py-5 text-center transition hover:border-primary hover:bg-primary/5">
        <UploadCloud className="h-7 w-7 text-primary" aria-hidden="true" />
        <span className="mt-3 text-sm font-medium">
          {uploadResume.isPending ? "Uploading resume" : "Upload PDF resume"}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          PDF only, 5MB max
        </span>
        <Input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={uploadResume.isPending}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
          }}
        />
      </label>

      {uploadResume.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Uploading before profile creation
        </div>
      )}

      {value && fileName && !uploadResume.isPending && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{fileName}</span>
          </span>
          <button
            type="button"
            className="rounded-sm p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={() => {
              setFileName(null);
              setPreviewFile(null);
              onChange("");
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Remove resume</span>
          </button>
        </div>
      )}

      {previewUrl && fileName && (
        <ResumePreview fileName={fileName} src={previewUrl} />
      )}

      {uploadError && (
        <p className="text-sm font-medium text-destructive">{uploadError}</p>
      )}
    </div>
  );
});
ResumeUploadControl.displayName = "ResumeUploadControl";

const ProfilePictureUploadControl = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<"div">, "onChange"> & {
    onChange: (value: string) => void;
    value?: string;
  }
>(({ className, onChange, value, ...props }, ref) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewFile] = useObjectPreviewUrl();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadProfilePicture =
    api.profilePicture.uploadProfilePicture.useMutation({
      onError(error) {
        setUploadError(error.message || "Profile picture upload failed.");
        setPreviewFile(null);
        onChange("");
      },
    });

  const handleFile = async (file: File | undefined) => {
    setUploadError(null);

    if (!file) {
      setFileName(null);
      setPreviewFile(null);
      onChange("");
      return;
    }

    if (!PROFILE_PICTURE_TYPES.includes(file.type)) {
      setUploadError(
        "Profile picture must be a JPEG, PNG, GIF, or WebP image.",
      );
      setFileName(null);
      setPreviewFile(null);
      onChange("");
      return;
    }

    if (file.size > MAX_PROFILE_PICTURE_SIZE) {
      setUploadError("Profile picture must be 2MB or smaller.");
      setFileName(null);
      setPreviewFile(null);
      onChange("");
      return;
    }

    setFileName(file.name);
    setPreviewFile(file);

    try {
      const fileContent = await fileToDataUrl(
        file,
        "Profile picture could not be read.",
      );
      const objectName = await uploadProfilePicture.mutateAsync({
        fileContent,
        fileName: file.name,
      });
      onChange(objectName);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Profile picture upload failed.",
      );
      setFileName(null);
      setPreviewFile(null);
      onChange("");
    }
  };

  return (
    <div ref={ref} className={cn("space-y-3", className)} {...props}>
      <label className="flex min-h-28 cursor-pointer items-center gap-4 rounded-md border border-dashed border-primary/40 bg-background/70 px-4 py-5 transition hover:border-primary hover:bg-primary/5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-7 w-7 text-primary" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {uploadProfilePicture.isPending
              ? "Uploading profile picture"
              : "Upload profile picture"}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            JPEG, PNG, GIF, or WebP, 2MB max
          </span>
          {fileName && (
            <span className="mt-2 block truncate text-xs text-muted-foreground">
              {fileName}
            </span>
          )}
        </div>
        <Input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="sr-only"
          disabled={uploadProfilePicture.isPending}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
          }}
        />
      </label>

      {uploadProfilePicture.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Uploading before profile creation
        </div>
      )}

      {value && fileName && !uploadProfilePicture.isPending && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{fileName}</span>
          </span>
          <button
            type="button"
            className="rounded-sm p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={() => {
              setFileName(null);
              setPreviewFile(null);
              onChange("");
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Remove profile picture</span>
          </button>
        </div>
      )}

      {uploadError && (
        <p className="text-sm font-medium text-destructive">{uploadError}</p>
      )}
    </div>
  );
});
ProfilePictureUploadControl.displayName = "ProfilePictureUploadControl";

function FieldControl({
  fieldConfig,
  value,
  onChange,
}: {
  fieldConfig: SignupField;
  onChange: (value: boolean | number | string) => void;
  value: boolean | number | string | undefined;
}) {
  const stringValue = typeof value === "string" ? value : "";

  if (fieldConfig.kind === "file") {
    return <ResumeUploadControl value={stringValue} onChange={onChange} />;
  }

  if (fieldConfig.kind === "image") {
    return (
      <ProfilePictureUploadControl value={stringValue} onChange={onChange} />
    );
  }

  if (fieldConfig.kind === "textarea") {
    return (
      <Textarea
        value={stringValue}
        className="min-h-32 bg-background/70"
        maxLength={fieldConfig.name === "about" ? 500 : undefined}
        placeholder={fieldConfig.placeholder}
        rows={5}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (fieldConfig.kind === "select") {
    return (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-11 bg-background/70">
          <SelectValue
            placeholder={`Select ${fieldConfig.label.toLowerCase()}`}
          />
        </SelectTrigger>
        <SelectContent>
          {(fieldConfig.options ?? []).map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (fieldConfig.kind === "combobox") {
    const options = fieldConfig.options ?? [];

    return (
      <ResponsiveComboBox
        items={options}
        value={stringValue}
        renderItem={(item) => <span>{item}</span>}
        getItemValue={(item) => item}
        getItemLabel={(item) => item}
        onValueChange={(nextValue) => onChange(nextValue)}
        buttonPlaceholder={fieldConfig.placeholder ?? "Select an option"}
        inputPlaceholder={`Search ${fieldConfig.label.toLowerCase()}`}
        triggerClassName="h-11 bg-background/70"
      />
    );
  }

  if (fieldConfig.kind === "boolean") {
    const isGuildVisibility = fieldConfig.name === "guildProfileVisible";
    const isVisible = Boolean(value);

    return (
      <div className="flex items-center justify-between gap-4 rounded-md border bg-background/70 p-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{fieldConfig.label}</p>
            {isGuildVisibility && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {isVisible ? "Public" : "Private"}
              </span>
            )}
          </div>
          {fieldConfig.description && (
            <p className="text-sm leading-5 text-muted-foreground">
              {isGuildVisibility && isVisible
                ? "Public profiles can be seen by other members on guild.knighthacks.org and by sponsors."
                : fieldConfig.description}
            </p>
          )}
        </div>
        <Switch
          className="shrink-0"
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
      </div>
    );
  }

  if (fieldConfig.kind === "checkbox") {
    const isCodeOfConduct = fieldConfig.name === "codeOfConductAccepted";

    return (
      <div className="flex items-start gap-3 rounded-md border bg-background/70 p-4">
        <Checkbox
          id={fieldConfig.name}
          className="mt-0.5 h-5 w-5"
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <div className="min-w-0 space-y-1">
          <label
            htmlFor={fieldConfig.name}
            className="text-sm font-medium leading-5"
          >
            {fieldConfig.label}
            {fieldConfig.required && (
              <span className="text-destructive"> *</span>
            )}
          </label>
          {isCodeOfConduct && (
            <p className="text-sm leading-5 text-muted-foreground">
              Read the{" "}
              <a
                href={MEMBER_CODE_OF_CONDUCT_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Knight Hacks Code of Conduct
              </a>
              .
            </p>
          )}
        </div>
      </div>
    );
  }

  if (fieldConfig.kind === "number") {
    return (
      <Input
        type="number"
        min={1900}
        max={2100}
        className="h-11 bg-background/70"
        value={typeof value === "number" ? value : ""}
        placeholder={fieldConfig.placeholder}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue === "" ? "" : Number(nextValue));
        }}
      />
    );
  }

  const inputType =
    fieldConfig.kind === "phone"
      ? "tel"
      : fieldConfig.kind === "url"
        ? "url"
        : fieldConfig.kind;

  return (
    <Input
      type={inputType}
      className="h-11 bg-background/70"
      value={stringValue}
      maxLength={fieldConfig.name === "tagline" ? 80 : undefined}
      placeholder={fieldConfig.placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function MemberSignupForm({
  definition,
}: {
  definition: SignupFormDefinition;
}) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fieldsBySection = useMemo(
    () =>
      sectionOrder.map((section) => ({
        section,
        fields: definition.fields.filter((field) => field.section === section),
      })),
    [definition.fields],
  );

  const form = useForm<MemberFormValues>({
    schema: memberFormSchema,
    defaultValues: getDefaultValues(),
  });

  const submitSignup = api.forms.createResponse.useMutation({
    async onSuccess() {
      await apiUtils.member.getMember.invalidate();
      setSubmitError(null);
      router.replace(definition.completionRedirectUrl);
      router.refresh();
    },
    onError(error) {
      setSubmitError(
        error.message || "Member signup failed. Please try again.",
      );
    },
  });

  return (
    <main className="container pb-10 pt-14 md:pb-16 md:pt-20 lg:pt-24">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-3">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal md:text-6xl">
            Build your Knight Hacks profile.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {definition.formData.description}
          </p>
        </div>

        <Form {...form}>
          <form
            className="space-y-7"
            noValidate
            onSubmit={form.handleSubmit((values) => {
              setSubmitError(null);
              submitSignup.mutate({
                form: definition.id,
                responseData: Object.fromEntries(Object.entries(values)),
              });
            })}
          >
            {fieldsBySection.map(({ section, fields }, sectionIndex) => {
              const meta = sectionMeta[section];
              const Icon = meta.icon;

              return (
                <RevealOnView key={section} delay={sectionIndex * 60}>
                  <Card className="border-white/10 bg-card/95 shadow-xl shadow-black/20 transition-transform duration-200 hover:-translate-y-0.5">
                    <CardHeader className="border-b border-border/70">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-xl">
                            {meta.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {meta.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-4">
                      <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                        {fields.map((fieldConfig) => (
                          <FormField
                            key={fieldConfig.name}
                            control={form.control}
                            name={fieldConfig.name}
                            render={({ field }) => (
                              <FormItem
                                className={cn(
                                  fieldConfig.kind === "textarea" &&
                                    "md:col-span-2",
                                  fieldConfig.kind === "file" &&
                                    "md:col-span-2",
                                  fieldConfig.kind === "image" &&
                                    "md:col-span-2",
                                  fieldConfig.kind === "boolean" &&
                                    "md:col-span-2",
                                  fieldConfig.kind === "checkbox" &&
                                    "md:col-span-2",
                                )}
                              >
                                {fieldConfig.kind !== "boolean" &&
                                  fieldConfig.kind !== "checkbox" && (
                                    <FormLabel className="text-sm font-medium">
                                      {fieldConfig.label}
                                      {fieldConfig.required && (
                                        <span className="text-destructive">
                                          {" "}
                                          *
                                        </span>
                                      )}
                                    </FormLabel>
                                  )}
                                <FormControl>
                                  <FieldControl
                                    fieldConfig={fieldConfig}
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                </FormControl>
                                {fieldConfig.kind !== "boolean" &&
                                  fieldConfig.kind !== "checkbox" &&
                                  fieldConfig.description && (
                                    <FormDescription>
                                      {fieldConfig.description}
                                    </FormDescription>
                                  )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </RevealOnView>
              );
            })}

            {submitError && (
              <RevealOnView>
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {submitError}
                </div>
              </RevealOnView>
            )}

            <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-md border bg-card/95 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Your profile is created from this form response.
              </p>
              <Button
                type="submit"
                size="lg"
                className="h-11 gap-2"
                disabled={submitSignup.isPending}
              >
                {submitSignup.isPending && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {submitSignup.isPending
                  ? "Creating profile"
                  : "Create member profile"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </main>
  );
}
