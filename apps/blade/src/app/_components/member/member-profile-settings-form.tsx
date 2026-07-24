"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  GraduationCap,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type {
  MemberSettingsFieldDefinition,
  MemberUpdateFormValues,
} from "@forge/validators";
import { GUILD } from "@forge/consts";
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
  Dialog,
  DialogClose,
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
import { Skeleton } from "@forge/ui/skeleton";
import { Switch } from "@forge/ui/switch";
import { Textarea } from "@forge/ui/textarea";
import {
  graduationTermYearFromDate,
  MEMBER_DASHBOARD_PATH,
  memberSettingsFields,
  memberUpdateFormSchema,
} from "@forge/validators";

import type { CareerHistoryDraft } from "~/app/_components/member/employment-history-editor";
import type { CurrentMember } from "~/hooks/use-member";
import { signOutFromBlade } from "~/app/_components/auth/sign-out-flow";
import { EmploymentHistoryEditor } from "~/app/_components/member/employment-history-editor";
import { dashboardNestedSurfaceClass } from "~/app/_components/member/member-dashboard";
import { MemberProfilePictureUpload } from "~/app/_components/member/member-profile-picture-upload";
import { MemberResumeUpload } from "~/app/_components/member/member-resume-upload";
import { MemberRouteTransitionLink } from "~/app/_components/member/member-route-transition-link";
import { useDebugLatency } from "~/hooks/use-debug-latency";
import { api } from "~/trpc/react";

type SettingsSection = MemberSettingsFieldDefinition["section"];
type CareerData = RouterOutputs["career"]["listMyEmployment"];
type MemberProfileFormSource = Omit<
  CurrentMember,
  | "currentCityKey"
  | "gender"
  | "guildLocationVisible"
  | "levelOfStudy"
  | "major"
  | "raceOrEthnicity"
  | "school"
  | "shirtSize"
> & {
  gender: string;
  levelOfStudy: string;
  major: string;
  raceOrEthnicity: string;
  school: string;
  shirtSize: string;
};

const sectionOrder: SettingsSection[] = ["Personal", "Academics", "Guild"];
const sectionMeta = {
  Personal: {
    icon: UserRound,
    title: "Your details",
    description: "Membership records, contact details, and check-in basics.",
  },
  Academics: {
    icon: GraduationCap,
    title: "Academics",
    description: "Academic context used for planning and member support.",
  },
  Guild: {
    icon: Sparkles,
    title: "Guild profile",
    description:
      "Public directory fields, recruiting links, profile photo, and resume.",
  },
} satisfies Record<
  SettingsSection,
  { description: ReactNode; icon: typeof UserRound; title: string }
>;

export function memberProfileFormDefaults(
  member: MemberProfileFormSource,
): MemberUpdateFormValues {
  const { gradTerm, gradYear } = graduationTermYearFromDate(member.gradDate);

  return {
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phoneNumber: member.phoneNumber ?? "",
    dob: member.dob,
    school: member.school,
    levelOfStudy: member.levelOfStudy,
    major: member.major,
    gender: member.gender,
    raceOrEthnicity: member.raceOrEthnicity,
    shirtSize: member.shirtSize,
    gradTerm,
    gradYear,
    company: member.company ?? "",
    githubProfileUrl: member.githubProfileUrl ?? "",
    linkedinProfileUrl: member.linkedinProfileUrl ?? "",
    websiteUrl: member.websiteUrl ?? "",
    profilePictureUrl: member.profilePictureUrl ?? "",
    resumeUrl: member.resumeUrl ?? "",
    tagline: member.tagline ?? "",
    about: member.about ?? "",
    guildProfileVisible: member.guildProfileVisible,
    guildResumeVisible: member.guildResumeVisible,
    guildOpportunityStatuses: member.guildOpportunityStatuses,
  };
}

export function MemberSettingsFieldControl({
  fieldConfig,
  onChange,
  value,
}: {
  fieldConfig: MemberSettingsFieldDefinition;
  onChange: (
    value: MemberUpdateFormValues[keyof MemberUpdateFormValues],
  ) => void;
  value: MemberUpdateFormValues[keyof MemberUpdateFormValues];
}) {
  const stringValue = typeof value === "string" ? value : "";

  if (fieldConfig.kind === "textarea") {
    return (
      <Textarea
        value={stringValue}
        className="min-h-36 bg-background/70"
        maxLength={fieldConfig.name === "about" ? 500 : undefined}
        placeholder={fieldConfig.placeholder}
        rows={6}
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
    const isVisible = Boolean(value);

    return (
      <div className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-background/70 p-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{fieldConfig.label}</p>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {isVisible ? "Public" : "Private"}
            </span>
          </div>
          {fieldConfig.description && (
            <p className="text-sm leading-5 text-muted-foreground">
              {fieldConfig.description}
            </p>
          )}
        </div>
        <Switch
          className="shrink-0"
          checked={isVisible}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
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

function UploadSettings({ member }: { member: CurrentMember }) {
  const displayName = `${member.firstName} ${member.lastName}`.trim();

  return (
    <div
      className={cn(
        dashboardNestedSurfaceClass,
        "grid gap-4 p-3 md:gap-5 md:p-4",
      )}
    >
      <div className="grid gap-4 md:gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-center">
        <div className="flex justify-center lg:justify-start">
          <MemberProfilePictureUpload
            displayName={displayName}
            initialProfilePictureUrl={member.profilePictureUrl}
          />
        </div>
        <MemberResumeUpload initialResumeUrl={member.resumeUrl} />
      </div>
    </div>
  );
}

export function MemberProfileSettingsForm({
  careerData,
  debugLatencyMs = 0,
  member,
}: {
  careerData: CareerData;
  debugLatencyMs?: number;
  member: CurrentMember;
}) {
  const isDebugDelayPending = useDebugLatency(debugLatencyMs);

  if (isDebugDelayPending) {
    return <MemberProfileSettingsSkeleton />;
  }

  return (
    <MemberProfileSettingsEditor careerData={careerData} member={member} />
  );
}

function MemberProfileSettingsSkeleton() {
  return (
    <main className="container pb-40 pt-6 md:pb-16 md:pt-12">
      <div className="mx-auto max-w-5xl space-y-5 md:space-y-8">
        <div className="space-y-4 md:space-y-5">
          <Skeleton className="h-9 w-32" />
          <div className="space-y-2 md:space-y-3">
            <Skeleton className="h-9 w-full max-w-sm md:h-14 md:max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl md:h-5" />
            <Skeleton className="h-4 w-4/5 max-w-xl md:h-5" />
          </div>
        </div>

        {sectionOrder.map((section) => (
          <Card
            key={section}
            className="gap-0 border-white/10 bg-card/95 py-0 shadow-xl shadow-black/20"
          >
            <CardHeader className="border-b border-border/70 px-4 py-4 md:px-6">
              <div className="flex items-center gap-3 md:gap-4">
                <Skeleton className="h-9 w-9 rounded-md md:h-10 md:w-10" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-4 py-4 md:space-y-5 md:px-6">
              {section === "Guild" && (
                <div
                  className={cn(
                    dashboardNestedSurfaceClass,
                    "grid gap-4 p-3 md:gap-5 md:p-4",
                  )}
                >
                  <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-center">
                    <div className="flex justify-center lg:justify-start">
                      <Skeleton className="h-32 w-32 rounded-full" />
                    </div>
                    <Skeleton className="h-24 w-full rounded-md" />
                  </div>
                </div>
              )}
              <div className="grid gap-x-4 gap-y-4 md:grid-cols-2 md:gap-y-5">
                {Array.from({ length: section === "Guild" ? 6 : 8 }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "space-y-2",
                        section === "Guild" && index === 2 && "md:col-span-2",
                      )}
                    >
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-11 w-full rounded-md" />
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="fixed inset-x-3 bottom-2 z-20 rounded-md border bg-card/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/40 md:sticky md:inset-x-auto md:bottom-4 md:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-4 w-56" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function MemberProfileSettingsEditor({
  careerData,
  member,
}: {
  careerData: CareerData;
  member: CurrentMember;
}) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDirtyDialogOpen, setIsDirtyDialogOpen] = useState(false);
  const [isSavingBeforeNavigation, setIsSavingBeforeNavigation] =
    useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [careerHistory, setCareerHistory] = useState<CareerHistoryDraft[]>(
    careerData.employment.map((employment) => ({
      cityKey: employment.cityKey,
      cityLabel: employment.city?.label ?? null,
      companyId: employment.company.id,
      companyLabel: employment.company.displayName,
      draftId: employment.id,
      endMonth: employment.endMonth,
      experienceType: employment.experienceType,
      guildVisible: employment.guildVisible,
      proposedCompanyName: null,
      startMonth: employment.startMonth,
      state: employment.state,
      title: employment.title,
    })),
  );
  const [currentCityKey, setCurrentCityKey] = useState(
    careerData.currentLocation.currentCityKey,
  );
  const [currentCityLabel, setCurrentCityLabel] = useState(
    careerData.currentLocation.city?.label ?? null,
  );
  const [guildLocationVisible, setGuildLocationVisible] = useState(
    careerData.currentLocation.guildLocationVisible,
  );
  const [careerMessage, setCareerMessage] = useState<string | null>(null);
  const [careerError, setCareerError] = useState<string | null>(null);
  const initialValues = useMemo(
    () => memberProfileFormDefaults(member),
    [member],
  );
  const form = useForm<MemberUpdateFormValues>({
    schema: memberUpdateFormSchema,
    defaultValues: initialValues,
  });
  const isDirty = form.formState.isDirty;

  const fieldsBySection = useMemo(
    () =>
      sectionOrder.map((section) => ({
        section,
        fields: memberSettingsFields.filter(
          (field) => field.section === section,
        ),
      })),
    [],
  );

  const updateMember = api.member.updateMember.useMutation({
    async onSuccess(updatedMember) {
      const nextValues = memberProfileFormDefaults(updatedMember);
      form.reset(nextValues);
      setSubmitError(null);
      setSavedMessage("Profile saved.");
      await apiUtils.member.getMember.invalidate();
    },
    onError(error) {
      setSavedMessage(null);
      setSubmitError(error.message || "Profile could not be saved.");
    },
  });
  const deleteMember = api.member.deleteMember.useMutation();
  const replaceEmployment = api.career.replaceMyEmploymentHistory.useMutation();
  const updateCurrentCity = api.career.updateMyCurrentCity.useMutation();
  const isDeleting = deleteMember.isPending;
  const isSaving = updateMember.isPending || isSavingBeforeNavigation;
  const isSavingCareer =
    replaceEmployment.isPending || updateCurrentCity.isPending;

  const saveCareer = async () => {
    setCareerMessage(null);
    setCareerError(null);
    const unconfirmed = careerHistory.find(
      (employment) =>
        employment.state === "unknown" || !employment.experienceType,
    );
    if (unconfirmed) {
      setCareerError(
        "Confirm whether each legacy entry is current or former before saving career history.",
      );
      return;
    }

    try {
      await Promise.all([
        replaceEmployment.mutateAsync(
          careerHistory.map(
            ({
              cityLabel: _cityLabel,
              companyLabel: _companyLabel,
              draftId: _draftId,
              ...employment
            }) => {
              const experienceType = employment.experienceType;
              if (!experienceType) {
                throw new Error("Choose an experience type.");
              }
              return {
                ...employment,
                experienceType,
                state: employment.state as "current" | "past",
                title: employment.title ?? "",
              };
            },
          ),
        ),
        updateCurrentCity.mutateAsync({
          currentCityKey,
          guildLocationVisible,
        }),
      ]);
      setCareerMessage("Career history saved.");
      await apiUtils.career.listMyEmployment.invalidate();
    } catch (error) {
      setCareerError(
        error instanceof Error
          ? error.message
          : "Career history could not be saved.",
      );
    }
  };

  const handleDashboardNavigation = () => {
    if (isDeleting || isSaving) return false;
    if (!isDirty) return true;

    setIsDirtyDialogOpen(true);
    return false;
  };

  const saveAndNavigateToDashboard = form.handleSubmit(
    async (values) => {
      setIsSavingBeforeNavigation(true);
      setSavedMessage(null);
      setSubmitError(null);

      try {
        await updateMember.mutateAsync(values);
        router.push(MEMBER_DASHBOARD_PATH);
      } catch {
        setIsDirtyDialogOpen(false);
      } finally {
        setIsSavingBeforeNavigation(false);
      }
    },
    () => {
      setIsDirtyDialogOpen(false);
    },
  );

  const discardAndNavigateToDashboard = () => {
    form.reset(initialValues);
    setSavedMessage(null);
    setSubmitError(null);
    setIsDirtyDialogOpen(false);
    router.push(MEMBER_DASHBOARD_PATH);
  };

  const handleDeleteProfile = async () => {
    setSavedMessage(null);
    setSubmitError(null);

    try {
      await deleteMember.mutateAsync();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Profile could not be deleted.",
      );
      setIsDeleteDialogOpen(false);
      return;
    }

    try {
      await signOutFromBlade();
    } catch {
      // The auth user and session rows are already gone; the next refresh lands unauthenticated.
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <main className="container pb-28 pt-6 md:pb-16 md:pt-12">
      <div className="mx-auto max-w-5xl space-y-5 md:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <Button asChild variant="ghost" className="-ml-3 gap-2">
              <MemberRouteTransitionLink
                href={MEMBER_DASHBOARD_PATH}
                beforeNavigate={handleDashboardNavigation}
              >
                <ArrowLeft
                  className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 group-data-[exiting=true]:-translate-x-2 motion-reduce:transition-none"
                  aria-hidden="true"
                />
                Dashboard
              </MemberRouteTransitionLink>
            </Button>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">
                Edit member profile
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
                Update the same profile details you created during onboarding.
                Profile picture and resume uploads save immediately.
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form
            className="space-y-4 md:space-y-7"
            noValidate
            onSubmit={form.handleSubmit((values) => {
              setSavedMessage(null);
              setSubmitError(null);
              updateMember.mutate(values);
            })}
          >
            {fieldsBySection.map(({ section, fields }) => {
              const meta = sectionMeta[section];
              const Icon = meta.icon;

              return (
                <Card
                  key={section}
                  className="gap-0 border-white/10 bg-card/95 py-0 shadow-xl shadow-black/20"
                >
                  <CardHeader className="border-b border-border/70 px-4 py-4 md:px-6">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary md:h-10 md:w-10">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg md:text-xl">
                          {meta.title}
                        </CardTitle>
                        <CardDescription className="mt-1 text-sm">
                          {meta.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 px-4 py-4 md:space-y-5 md:px-6">
                    {section === "Guild" && <UploadSettings member={member} />}
                    <div className="grid gap-x-4 gap-y-4 md:grid-cols-2 md:gap-y-5">
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
                                fieldConfig.kind === "boolean" &&
                                  "md:col-span-2",
                              )}
                            >
                              {fieldConfig.kind !== "boolean" && (
                                <FormLabel className="text-sm font-medium">
                                  {fieldConfig.label}
                                  {fieldConfig.required && (
                                    <span className="text-destructive"> *</span>
                                  )}
                                </FormLabel>
                              )}
                              <FormControl>
                                <MemberSettingsFieldControl
                                  fieldConfig={fieldConfig}
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              {fieldConfig.kind !== "boolean" &&
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
                      {section === "Guild" ? (
                        <FormField
                          control={form.control}
                          name="guildOpportunityStatuses"
                          render={({ field }) => {
                            const selected = field.value ?? [];

                            return (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Opportunity status</FormLabel>
                                <FormDescription>
                                  Choose up to{" "}
                                  {GUILD.GUILD_MAX_OPPORTUNITY_STATUSES}. These
                                  public labels help members and recruiters find
                                  the right people.
                                </FormDescription>
                                <FormControl>
                                  <div className="grid gap-2 pt-1 sm:grid-cols-2">
                                    {GUILD.GUILD_OPPORTUNITY_STATUS_OPTIONS.map(
                                      (status) => {
                                        const checked =
                                          selected.includes(status);
                                        const disabled =
                                          !checked &&
                                          selected.length >=
                                            GUILD.GUILD_MAX_OPPORTUNITY_STATUSES;

                                        return (
                                          <label
                                            key={status}
                                            className="flex cursor-pointer items-start gap-3 rounded-md border border-white/10 bg-background/70 p-3 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                                          >
                                            <Checkbox
                                              checked={checked}
                                              disabled={disabled}
                                              onCheckedChange={() =>
                                                field.onChange(
                                                  checked
                                                    ? selected.filter(
                                                        (candidate) =>
                                                          candidate !== status,
                                                      )
                                                    : [...selected, status],
                                                )
                                              }
                                            />
                                            <span className="leading-5">
                                              {
                                                GUILD
                                                  .GUILD_OPPORTUNITY_STATUS_LABELS[
                                                  status
                                                ]
                                              }
                                            </span>
                                          </label>
                                        );
                                      },
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Card className="gap-0 border-white/10 bg-card/95 py-0 shadow-xl shadow-black/20">
              <CardHeader className="border-b border-border/70 px-4 py-4 md:px-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary md:h-10 md:w-10">
                    <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg md:text-xl">
                      Career and location
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      Professional history and the explicit city used by Guild.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 px-4 py-4 md:px-6">
                <EmploymentHistoryEditor
                  currentCityKey={currentCityKey}
                  currentCityLabel={currentCityLabel}
                  guildLocationVisible={guildLocationVisible}
                  history={careerHistory}
                  onCurrentCityChange={(city) => {
                    setCurrentCityKey(city?.key ?? null);
                    setCurrentCityLabel(city?.label ?? null);
                    setCareerMessage(null);
                  }}
                  onGuildLocationVisibleChange={(visible) => {
                    setGuildLocationVisible(visible);
                    setCareerMessage(null);
                  }}
                  onHistoryChange={(history) => {
                    setCareerHistory(history);
                    setCareerMessage(null);
                  }}
                />
                {careerError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {careerError}
                  </div>
                )}
                <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    className="text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    {careerMessage ??
                      "Career changes save independently from profile details."}
                  </p>
                  <Button
                    type="button"
                    className="min-h-11 gap-2"
                    disabled={isSavingCareer}
                    onClick={() => void saveCareer()}
                  >
                    {isSavingCareer ? (
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Save className="size-4" aria-hidden="true" />
                    )}
                    {isSavingCareer ? "Saving career" : "Save career"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {submitError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <div className="fixed inset-x-3 bottom-2 z-20 rounded-md border bg-card/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/40 backdrop-blur md:sticky md:inset-x-auto md:bottom-4 md:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p
                  className="text-xs text-muted-foreground md:text-sm"
                  aria-live="polite"
                >
                  {savedMessage ??
                    (isDirty
                      ? "You have unsaved profile changes."
                      : "Your profile is up to date.")}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 sm:w-auto"
                    disabled={!isDirty || isSaving || isDeleting}
                    onClick={() => {
                      form.reset(initialValues);
                      setSavedMessage(null);
                      setSubmitError(null);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    className="w-full gap-2 sm:w-auto"
                    disabled={!isDirty || isSaving || isDeleting}
                  >
                    {updateMember.isPending ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Save className="h-4 w-4" aria-hidden="true" />
                    )}
                    {updateMember.isPending ? "Saving" : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mb-28 flex flex-col gap-3 rounded-md border border-destructive/30 bg-card/95 p-3 shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between md:mb-0 md:p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-destructive">
                  Delete profile
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Permanently remove your member profile, signup response,
                  uploads, and auth account.
                </p>
              </div>
              <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                  if (isDeleting) return;
                  setIsDeleteDialogOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-2 sm:shrink-0"
                    disabled={isSaving || isDeleting}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Delete member profile?</DialogTitle>
                    <DialogDescription>
                      This removes your member record, onboarding response,
                      uploads, and login account. This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isDeleting}
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      type="button"
                      variant="destructive"
                      className="gap-2"
                      disabled={isDeleting}
                      onClick={handleDeleteProfile}
                    >
                      {isDeleting ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                      {isDeleting ? "Deleting" : "Delete my profile"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </form>
        </Form>

        <Dialog
          open={isDirtyDialogOpen}
          onOpenChange={(open) => {
            if (isSavingBeforeNavigation) return;
            setIsDirtyDialogOpen(open);
          }}
        >
          <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] overflow-y-auto pt-10 [&>button.absolute]:left-4 [&>button.absolute]:right-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <DialogTitle>Leave with unsaved changes?</DialogTitle>
                  <DialogDescription className="mt-1">
                    Save your profile before returning to the dashboard, discard
                    changes, or close this dialog to keep editing.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingBeforeNavigation}
                onClick={discardAndNavigateToDashboard}
              >
                Discard
              </Button>
              <Button
                type="button"
                className="gap-2"
                disabled={isSavingBeforeNavigation}
                onClick={() => void saveAndNavigateToDashboard()}
              >
                {isSavingBeforeNavigation ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {isSavingBeforeNavigation ? "Saving" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
