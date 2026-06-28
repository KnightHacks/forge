"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  GraduationCap,
  IdCard,
  Loader2,
  Pencil,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type {
  AdminMemberEditableProfileValues,
  MemberSettingsFieldDefinition,
} from "@forge/validators";
import { cn } from "@forge/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@forge/ui/avatar";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  ADMIN_MEMBER_DELETE_CONFIRMATION,
  adminMemberEditableProfileSchema,
  formatDuesAmount,
  memberSettingsFields,
} from "@forge/validators";

import {
  memberProfileFormDefaults,
  MemberSettingsFieldControl,
} from "~/app/_components/member/member-profile-settings-form";
import { api } from "~/trpc/react";

type AdminMemberDetail = RouterOutputs["member"]["getAdminMember"];
type SettingsSection = MemberSettingsFieldDefinition["section"];

const sectionOrder: SettingsSection[] = ["Personal", "Academics", "Guild"];
const sectionTitles = {
  Personal: "Personal details",
  Academics: "Academic details",
  Guild: "Guild profile",
} satisfies Record<SettingsSection, string>;

function display(value: boolean | number | string | null | undefined) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value == null || value === "") return "Not provided";
  return String(value);
}

function formatTimestamp(value: Date | null) {
  if (!value) return "Not paid";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function DetailValue({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 min-w-0 break-words text-sm leading-6 text-foreground [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

function DetailSection({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon: typeof UserRound;
  title: string;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-background/45">
      <div className="flex items-start gap-2.5 border-b border-border/70 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function ProfileLink({ href }: { href: string | null }) {
  if (!href) return "Not provided";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-w-0 items-center gap-1.5 text-primary hover:underline"
    >
      <span className="min-w-0 break-all">{href}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}

function fileToDataUrl(file: File, failureMessage: string) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(failureMessage));
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(failureMessage));
    };
    reader.readAsDataURL(file);
  });
}

function AdminMemberFiles({
  canEdit,
  detail,
  onChanged,
}: {
  canEdit: boolean;
  detail: AdminMemberDetail;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const uploadPicture = api.member.uploadAdminProfilePicture.useMutation();
  const removePicture = api.member.removeAdminProfilePicture.useMutation();
  const uploadResume = api.member.uploadAdminResume.useMutation();
  const removeResume = api.member.removeAdminResume.useMutation();
  const isPending =
    uploadPicture.isPending ||
    removePicture.isPending ||
    uploadResume.isPending ||
    removeResume.isPending;

  const run = async (operation: () => Promise<unknown>, message: string) => {
    setError(null);
    try {
      await operation();
      toast.success(message);
      onChanged();
    } catch (operationError) {
      setError(
        operationError instanceof Error
          ? operationError.message
          : "Member file could not be changed.",
      );
    }
  };

  return (
    <DetailSection
      title="Profile files"
      icon={FileText}
      description={
        canEdit
          ? "Secure previews and target-owned replacements."
          : "Secure previews expire automatically."
      }
    >
      <div className="min-w-0 divide-y divide-border/70 md:grid md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="flex min-w-0 flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
          <Avatar className="h-14 w-14 shrink-0 border border-white/10">
            {detail.profilePictureUrl && (
              <AvatarImage
                src={detail.profilePictureUrl}
                alt={`${detail.member.firstName} ${detail.member.lastName} profile picture`}
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-primary/15 text-xl text-primary">
              {detail.member.firstName[0]}
              {detail.member.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-2">
            <div>
              <h4 className="text-sm font-medium">Profile picture</h4>
              <p className="text-sm text-muted-foreground">
                {detail.member.profilePictureUrl ? "Available" : "Not uploaded"}
              </p>
            </div>
            {canEdit && (
              <div className="flex min-w-0 flex-wrap gap-2">
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:h-9">
                  <UploadCloud className="h-4 w-4" />
                  {detail.member.profilePictureUrl ? "Replace" : "Upload"}
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="sr-only"
                    disabled={isPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void run(async () => {
                        const fileContent = await fileToDataUrl(
                          file,
                          "Profile picture could not be read.",
                        );
                        return uploadPicture.mutateAsync({
                          fileContent,
                          fileName: file.name,
                          memberId: detail.member.id,
                        });
                      }, "Profile picture saved.");
                    }}
                  />
                </label>
                {detail.member.profilePictureUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Remove profile picture"
                    disabled={isPending}
                    onClick={() =>
                      void run(
                        () =>
                          removePicture.mutateAsync({
                            memberId: detail.member.id,
                          }),
                        "Profile picture removed.",
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0 space-y-2">
            <div>
              <h4 className="text-sm font-medium">Resume</h4>
              <p className="text-sm text-muted-foreground">
                {detail.member.resumeUrl ? "Available" : "Not uploaded"}
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              {detail.resumeUrl && (
                <Button asChild type="button" size="sm" variant="outline">
                  <a href={detail.resumeUrl} target="_blank" rel="noreferrer">
                    View resume
                  </a>
                </Button>
              )}
              {canEdit && (
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:h-9">
                  <UploadCloud className="h-4 w-4" />
                  {detail.member.resumeUrl ? "Replace" : "Upload"}
                  <Input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    disabled={isPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void run(async () => {
                        const fileContent = await fileToDataUrl(
                          file,
                          "Resume could not be read.",
                        );
                        return uploadResume.mutateAsync({
                          fileContent,
                          fileName: file.name,
                          memberId: detail.member.id,
                        });
                      }, "Resume saved.");
                    }}
                  />
                </label>
              )}
              {canEdit && detail.member.resumeUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Remove resume"
                  disabled={isPending}
                  onClick={() =>
                    void run(
                      () =>
                        removeResume.mutateAsync({
                          memberId: detail.member.id,
                        }),
                      "Resume removed.",
                    )
                  }
                >
                  <X className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {error && (
        <p className="border-t border-border/70 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </DetailSection>
  );
}

function AdminMemberEditForm({
  detail,
  onCancel,
  onSaved,
}: {
  detail: AdminMemberDetail;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const defaults = useMemo(() => {
    const {
      profilePictureUrl: _picture,
      resumeUrl: _resume,
      ...profile
    } = memberProfileFormDefaults(detail.member);
    return profile;
  }, [detail.member]);
  const [points, setPoints] = useState(detail.member.points);
  const form = useForm<AdminMemberEditableProfileValues>({
    schema: adminMemberEditableProfileSchema,
    defaultValues: defaults,
  });
  const update = api.member.updateAdminMember.useMutation({
    onSuccess() {
      toast.success("Member profile saved.");
      onSaved();
    },
    onError(error) {
      toast.error(error.message || "Member profile could not be saved.");
    },
  });

  return (
    <Form {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit((profile) =>
          update.mutate({ memberId: detail.member.id, points, profile }),
        )}
      >
        {sectionOrder.map((section) => (
          <section
            key={section}
            className="space-y-4 rounded-md border border-white/10 bg-background/60 p-4"
          >
            <h3 className="font-semibold">{sectionTitles[section]}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {memberSettingsFields
                .filter((field) => field.section === section)
                .map((fieldConfig) => (
                  <FormField
                    key={fieldConfig.name}
                    control={form.control}
                    name={
                      fieldConfig.name as keyof AdminMemberEditableProfileValues
                    }
                    render={({ field }) => (
                      <FormItem
                        className={cn(
                          fieldConfig.kind === "textarea" && "md:col-span-2",
                        )}
                      >
                        <FormLabel>{fieldConfig.label}</FormLabel>
                        <FormControl>
                          <MemberSettingsFieldControl
                            fieldConfig={fieldConfig}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              {section === "Personal" && (
                <div className="space-y-2">
                  <label
                    htmlFor="admin-member-points"
                    className="text-sm font-medium"
                  >
                    Points
                  </label>
                  <Input
                    id="admin-member-points"
                    type="number"
                    min={0}
                    className="h-11 bg-background/70"
                    value={points}
                    onChange={(event) => setPoints(Number(event.target.value))}
                  />
                </div>
              )}
            </div>
          </section>
        ))}

        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border/70 bg-card/95 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save member
          </Button>
        </div>
      </form>
    </Form>
  );
}

function DeleteMemberDialog({
  detail,
  onDeleted,
}: {
  detail: AdminMemberDetail;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const remove = api.member.deleteAdminMember.useMutation({
    onSuccess() {
      toast.success("Member profile deleted.");
      setOpen(false);
      setConfirmation("");
      onDeleted();
    },
    onError(error) {
      toast.error(error.message || "Member profile could not be deleted.");
    },
  });

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Delete member
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-destructive/30 bg-card/95 motion-reduce:animate-none">
          <DialogHeader>
            <DialogTitle>Delete this Member profile?</DialogTitle>
            <DialogDescription>
              This removes membership data, dues, the signup response, and
              member-owned files. The Blade account, roles, sessions, and Hacker
              data remain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="delete-member-confirmation"
              className="text-sm font-medium"
            >
              Type{" "}
              <span className="font-mono">
                {ADMIN_MEMBER_DELETE_CONFIRMATION}
              </span>
            </label>
            <Input
              id="delete-member-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                confirmation !== ADMIN_MEMBER_DELETE_CONFIRMATION ||
                remove.isPending
              }
              onClick={() =>
                remove.mutate({
                  confirmation: ADMIN_MEMBER_DELETE_CONFIRMATION,
                  memberId: detail.member.id,
                })
              }
            >
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Member profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MemberDetailDialog({
  canEdit,
  detail,
  onClose,
  onChanged,
  onDeleted,
}: {
  canEdit: boolean;
  detail: AdminMemberDetail;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const dues = api.member.setAdminDuesStatus.useMutation({
    onSuccess() {
      toast.success("Dues status updated.");
      onChanged();
    },
    onError(error) {
      toast.error(error.message || "Dues status could not be updated.");
    },
  });
  const member = detail.member;
  const fullName = `${member.firstName} ${member.lastName}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="z-[60] h-[100svh] max-h-[100svh] w-screen max-w-none gap-0 overflow-y-auto overflow-x-hidden rounded-none border-0 bg-card p-0 shadow-2xl motion-reduce:animate-none sm:h-auto sm:max-h-[92svh] sm:w-[calc(100svw-1rem)] sm:max-w-5xl sm:rounded-lg sm:border sm:border-white/10 [&_button]:min-h-11 sm:[&_button]:min-h-9">
        <DialogHeader
          data-testid="member-detail-header"
          className="border-b border-border/70 px-4 py-3 pr-14 text-left sm:px-6 sm:py-5"
        >
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Avatar className="h-14 w-14 shrink-0 border border-white/10 shadow-lg sm:h-20 sm:w-20">
                {detail.profilePictureUrl && (
                  <AvatarImage
                    src={detail.profilePictureUrl}
                    alt={`${fullName} profile picture`}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-primary/15 text-lg text-primary sm:text-2xl">
                  {member.firstName[0]}
                  {member.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1 sm:space-y-2">
                <DialogTitle className="truncate text-xl sm:text-2xl">
                  {fullName}
                </DialogTitle>
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                  <DialogDescription className="min-w-0 truncate text-xs sm:text-sm">
                    @{member.discordUser}
                  </DialogDescription>
                  <Badge
                    variant={detail.duesStatus.paid ? "default" : "secondary"}
                    className="shrink-0 text-[11px] sm:text-xs"
                  >
                    {detail.duesStatus.paid ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
              </div>
            </div>
            {canEdit && !editing && (
              <Button
                type="button"
                data-member-edit-placement="dialog-header"
                className="w-full sm:ml-auto sm:w-auto sm:shrink-0"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit member
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="min-w-0 px-3 py-4 sm:px-5 sm:py-5 md:px-6">
          {editing ? (
            <AdminMemberEditForm
              detail={detail}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                onChanged();
              }}
            />
          ) : (
            <div
              data-member-detail-layout="sectioned"
              className="min-w-0 space-y-4 sm:space-y-5"
            >
              <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
                <div className="order-2 min-w-0 space-y-4 sm:space-y-5 lg:order-1">
                  <DetailSection title="Contact & identity" icon={UserRound}>
                    <dl className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4 sm:p-4">
                      <DetailValue label="Email" value={member.email} />
                      <DetailValue
                        label="Phone"
                        value={display(member.phoneNumber)}
                      />
                      <DetailValue label="Date of birth" value={member.dob} />
                      <DetailValue label="Age" value={member.age} />
                      <DetailValue
                        label="Shirt size"
                        value={member.shirtSize}
                      />
                      <DetailValue label="Gender" value={member.gender} />
                      <DetailValue
                        label="Race or ethnicity"
                        value={member.raceOrEthnicity}
                        wide
                      />
                    </dl>
                  </DetailSection>

                  <DetailSection title="Academics & work" icon={GraduationCap}>
                    <dl className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4 sm:p-4">
                      <DetailValue label="School" value={member.school} wide />
                      <DetailValue label="Major" value={member.major} />
                      <DetailValue
                        label="Level of study"
                        value={member.levelOfStudy}
                      />
                      <DetailValue
                        label="Graduation date"
                        value={member.gradDate}
                      />
                      <DetailValue
                        label="Company"
                        value={display(member.company)}
                      />
                    </dl>
                  </DetailSection>

                  <DetailSection title="Guild profile" icon={ShieldCheck}>
                    <dl className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4 sm:p-4">
                      <DetailValue
                        label="Visibility"
                        value={
                          member.guildProfileVisible ? "Public" : "Private"
                        }
                      />
                      <DetailValue label="Points" value={member.points} />
                      <DetailValue
                        label="Tagline"
                        value={display(member.tagline)}
                        wide
                      />
                      <DetailValue
                        label="About"
                        value={display(member.about)}
                        wide
                      />
                      <DetailValue
                        label="GitHub"
                        value={<ProfileLink href={member.githubProfileUrl} />}
                        wide
                      />
                      <DetailValue
                        label="LinkedIn"
                        value={<ProfileLink href={member.linkedinProfileUrl} />}
                        wide
                      />
                      <DetailValue
                        label="Website"
                        value={<ProfileLink href={member.websiteUrl} />}
                        wide
                      />
                    </dl>
                  </DetailSection>

                  <AdminMemberFiles
                    canEdit={canEdit}
                    detail={detail}
                    onChanged={onChanged}
                  />
                </div>

                <aside className="contents lg:sticky lg:top-4 lg:order-2 lg:block lg:min-w-0 lg:space-y-5">
                  <div className="order-1 min-w-0">
                    <DetailSection title="Membership & dues" icon={ShieldCheck}>
                      <div className="min-w-0 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Current status
                            </p>
                            <p className="mt-1 text-sm leading-5">
                              {detail.duesStatus.paid
                                ? `Paid for ${detail.duesStatus.paymentAcademicYear.shortLabel}`
                                : `Unpaid for ${detail.duesStatus.payableAcademicYear.shortLabel}`}
                            </p>
                          </div>
                          <Badge
                            variant={
                              detail.duesStatus.paid ? "default" : "secondary"
                            }
                            className="shrink-0"
                          >
                            {detail.duesStatus.paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </div>

                        <dl className="mt-3 divide-y divide-border/70 border-y border-border/70 text-sm">
                          <div className="flex min-w-0 items-start justify-between gap-3 py-2.5">
                            <dt className="text-muted-foreground">
                              Academic year
                            </dt>
                            <dd className="text-right font-medium">
                              {detail.duesStatus.paid
                                ? detail.duesStatus.paymentAcademicYear
                                    .shortLabel
                                : detail.duesStatus.payableAcademicYear
                                    .shortLabel}
                            </dd>
                          </div>
                          <div className="flex min-w-0 items-start justify-between gap-3 py-2.5">
                            <dt className="text-muted-foreground">Paid date</dt>
                            <dd className="text-right font-medium">
                              {formatTimestamp(detail.duesStatus.paidAt)}
                            </dd>
                          </div>
                          <div className="flex min-w-0 items-start justify-between gap-3 py-2.5">
                            <dt className="text-muted-foreground">Amount</dt>
                            <dd className="text-right font-medium">
                              {detail.duesStatus.amountPaid == null
                                ? detail.duesStatus.amountDueLabel
                                : formatDuesAmount(
                                    detail.duesStatus.amountPaid,
                                  )}
                            </dd>
                          </div>
                        </dl>

                        {canEdit && (
                          <Button
                            type="button"
                            className="mt-3 w-full"
                            variant={
                              detail.duesStatus.paid ? "outline" : "secondary"
                            }
                            disabled={dues.isPending}
                            onClick={() =>
                              dues.mutate({
                                memberId: member.id,
                                paid: !detail.duesStatus.paid,
                              })
                            }
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {detail.duesStatus.paid
                              ? "Revoke dues"
                              : "Grant dues"}
                          </Button>
                        )}
                      </div>
                    </DetailSection>
                  </div>

                  <div className="order-3 min-w-0">
                    <DetailSection title="Record details" icon={IdCard}>
                      <dl className="grid min-w-0 gap-3 p-3 sm:gap-y-4 sm:p-4">
                        <DetailValue
                          label="Joined"
                          value={`${member.dateCreated} ${member.timeCreated}`}
                        />
                        <DetailValue
                          label="Member ID"
                          value={
                            <span className="break-all font-mono text-xs">
                              {member.id}
                            </span>
                          }
                        />
                        <DetailValue
                          label="User ID"
                          value={
                            <span className="break-all font-mono text-xs">
                              {member.userId}
                            </span>
                          }
                        />
                      </dl>
                      {canEdit && (
                        <div className="flex justify-stretch border-t border-border/70 p-3 sm:justify-end sm:p-4">
                          <DeleteMemberDialog
                            detail={detail}
                            onDeleted={onDeleted}
                          />
                        </div>
                      )}
                    </DetailSection>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
