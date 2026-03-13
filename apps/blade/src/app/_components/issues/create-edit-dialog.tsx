"use client";

import * as React from "react";
import { Link2, Plus, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Switch } from "@forge/ui/switch";
import { Textarea } from "@forge/ui/textarea";

type IssueStatus = (typeof STATUS_OPTIONS)[number]["value"];

type DetailSectionKey = "details" | "requirements" | "links";

type LinkItem = {
  id: string;
  label: string;
  url: string;
};

export interface IssueFormValues {
  title: string;
  status: IssueStatus;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  team: string;
  priority: string;
  isHackathonCritical: boolean;
  requiresRoom: boolean;
  needsDesignAssets: boolean;
  needsOutreach: boolean;
  details: string;
  requirements: string;
  links: LinkItem[];
  notes: string;
}

export interface CreateEditDialogProps {
  open: boolean;
  intent?: "create" | "edit";
  initialValues?: Partial<IssueFormValues>;
  onClose?: () => void;
  onSubmit?: (values: IssueFormValues) => void;
  onDelete?: (values: IssueFormValues) => void;
}

const STATUS_OPTIONS = [
  {
    value: "confirmed",
    label: "Confirmed",
    caption: "Everything is locked in",
    dotClass: "bg-emerald-400",
  },
  {
    value: "tentative",
    label: "Tentative",
    caption: "Waiting on a few details",
    dotClass: "bg-amber-400",
  },
  {
    value: "draft",
    label: "Draft",
    caption: "Still being scoped",
    dotClass: "bg-slate-400",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    caption: "No longer happening",
    dotClass: "bg-rose-400",
  },
] as const;

const SECTION_TABS: { key: DetailSectionKey; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "requirements", label: "Room & Requirements" },
  { key: "links", label: "Links & Notes" },
];

const TEAM_OPTIONS = [
  "Design",
  "Workshop",
  "Outreach",
  "Programs",
  "Sponsorship",
  "E-Board",
];

const PRIORITY_OPTIONS = ["High", "Medium", "Low"];

const REQUIREMENT_FLAGS: {
  key: keyof Pick<IssueFormValues, "needsDesignAssets" | "needsOutreach">;
  label: string;
  caption: string;
}[] = [
  {
    key: "needsDesignAssets",
    label: "Requires Design Assets",
    caption: "Decks, flyers, or other creative deliverables",
  },
  {
    key: "needsOutreach",
    label: "Requires Outreach/Marketing",
    caption: "Share with campus orgs or sponsors",
  },
];

const focusGlow =
  "transition-[border,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[rgba(120,82,255,0.45)] focus-visible:border-transparent";

const baseField = cn(
  "text-foreground placeholder:text-foreground/50 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm backdrop-blur-md hover:border-white/20",
  focusGlow,
);

const tabButtonBase = cn(
  "text-foreground/70 hover:text-foreground flex-1 rounded-2xl border border-white/10 bg-white/0 px-4 py-3 text-sm font-medium transition-all duration-200",
  focusGlow,
);

const createLinkItem = (): LinkItem => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  label: "",
  url: "",
});

const defaultForm = (): IssueFormValues => {
  const now = new Date();
  const end = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    title: "",
    status: "confirmed",
    startDate: formatDateForInput(now),
    startTime: formatTimeForInput(now),
    endDate: formatDateForInput(end),
    endTime: formatTimeForInput(end),
    allDay: false,
    team: "",
    priority: "",
    isHackathonCritical: false,
    requiresRoom: false,
    needsDesignAssets: false,
    needsOutreach: false,
    details: "",
    requirements: "",
    links: [],
    notes: "",
  };
};

export function CreateEditDialog(props: CreateEditDialogProps) {
  const {
    open,
    intent = "create",
    initialValues,
    onClose,
    onDelete,
    onSubmit,
  } = props;
  const [portalElement, setPortalElement] = React.useState<Element | null>(
    null,
  );
  const [activeSection, setActiveSection] =
    React.useState<DetailSectionKey>("details");
  const buildInitialFormValues = React.useCallback(() => {
    const defaults = defaultForm();
    return {
      ...defaults,
      ...initialValues,
      links: initialValues?.links ?? defaults.links,
    };
  }, [initialValues]);
  const [formValues, setFormValues] = React.useState<IssueFormValues>(
    buildInitialFormValues,
  );
  const baseId = React.useId();

  React.useEffect(() => {
    setPortalElement(document.body);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setFormValues(buildInitialFormValues());
    setActiveSection("details");
  }, [buildInitialFormValues, open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [open, onClose]);

  const statusMeta = React.useMemo(
    () =>
      STATUS_OPTIONS.find((status) => status.value === formValues.status) ??
      STATUS_OPTIONS[0],
    [formValues.status],
  );

  const handleOverlayPointerDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const updateForm = <K extends keyof IssueFormValues>(
    key: K,
    value: IssueFormValues[K],
  ) => {
    setFormValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleAddLink = () => {
    setFormValues((previous) => ({
      ...previous,
      links: [...previous.links, createLinkItem()],
    }));
  };

  const handleRemoveLink = (id: string) => {
    setFormValues((previous) => ({
      ...previous,
      links: previous.links.filter((link) => link.id !== id),
    }));
  };

  const handleLinkUpdate = (id: string, key: keyof LinkItem, value: string) => {
    setFormValues((previous) => ({
      ...previous,
      links: previous.links.map((link) =>
        link.id === id
          ? {
              ...link,
              [key]: value,
            }
          : link,
      ),
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(formValues);
  };

  const handleDelete = () => {
    if (intent === "edit") {
      onDelete?.(formValues);
    }
  };

  if (!open || !portalElement) {
    return null;
  }

  return createPortal(
    <div
      aria-modal
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10 backdrop-blur-2xl"
      onMouseDown={handleOverlayPointerDown}
    >
      <form
        className="animate-in fade-in-0 zoom-in-95 text-foreground relative flex max-h-[90vh] w-full max-w-[680px] flex-col rounded-[28px] border border-white/10 bg-[rgba(8,8,20,0.95)] p-8 font-sans shadow-[0_25px_120px_rgba(0,0,0,0.45)]"
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        style={{ maxHeight: "90vh" }}
      >
        <button
          type="button"
          className="absolute top-6 right-6 inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:border-white/40 hover:text-white"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="space-y-2 pr-12">
          <p className="text-xs font-semibold tracking-[0.4em] text-white/40 uppercase">
            {intent === "edit" ? "Edit Event" : "Create Event"}
          </p>
          <h2 className="text-2xl font-semibold text-white">
            {intent === "edit"
              ? "Update the event details below"
              : "Enter the event details below"}
          </h2>
        </header>

        <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/12 mt-8 -mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
          <div className="flex flex-col space-y-6">
            <div className="space-y-3">
              <Label
                htmlFor={`${baseId}-title`}
                className="text-sm text-white/70"
              >
                Title
              </Label>
              <Input
                id={`${baseId}-title`}
                className={cn(baseField, "h-12 text-base font-medium")}
                placeholder="Event title"
                value={formValues.title}
                onChange={(event) => updateForm("title", event.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm text-white/70">Status</Label>
              <Select
                value={formValues.status}
                onValueChange={(value) =>
                  updateForm("status", value as IssueStatus)
                }
              >
                <SelectTrigger
                  className={cn(baseField, "h-14 pr-12")}
                  aria-label="Event status"
                >
                  <div className="flex flex-1 items-center gap-3 text-left">
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        statusMeta.dotClass,
                      )}
                    />
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold text-white">
                        {statusMeta.label}
                      </span>
                      <span className="text-xs text-white/50">
                        {statusMeta.caption}
                      </span>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="min-w-[22rem] border-white/10 bg-[#0f0f1c] text-white">
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "size-2.5 rounded-full",
                            option.dotClass,
                          )}
                        />
                        <div className="leading-tight">
                          <p className="text-sm font-semibold">
                            {option.label}
                          </p>
                          <p className="text-xs text-white/60">
                            {option.caption}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor={`${baseId}-start-date`}
                    className="text-xs tracking-wider text-white/50 uppercase"
                  >
                    Start Date
                  </Label>
                  <Input
                    id={`${baseId}-start-date`}
                    type="date"
                    className={cn(baseField, "h-12")}
                    value={formValues.startDate}
                    onChange={(event) =>
                      updateForm("startDate", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor={`${baseId}-start-time`}
                    className="text-xs tracking-wider text-white/50 uppercase"
                  >
                    Start Time
                  </Label>
                  <Input
                    id={`${baseId}-start-time`}
                    type="time"
                    className={cn(
                      baseField,
                      "h-12",
                      formValues.allDay && "opacity-40",
                    )}
                    value={formValues.startTime}
                    disabled={formValues.allDay}
                    onChange={(event) =>
                      updateForm("startTime", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor={`${baseId}-end-date`}
                    className="text-xs tracking-wider text-white/50 uppercase"
                  >
                    End Date
                  </Label>
                  <Input
                    id={`${baseId}-end-date`}
                    type="date"
                    className={cn(baseField, "h-12")}
                    value={formValues.endDate}
                    onChange={(event) =>
                      updateForm("endDate", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor={`${baseId}-end-time`}
                    className="text-xs tracking-wider text-white/50 uppercase"
                  >
                    End Time
                  </Label>
                  <Input
                    id={`${baseId}-end-time`}
                    type="time"
                    className={cn(
                      baseField,
                      "h-12",
                      formValues.allDay && "opacity-40",
                    )}
                    value={formValues.endTime}
                    disabled={formValues.allDay}
                    onChange={(event) =>
                      updateForm("endTime", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex items-start justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                <div>
                  <p className="text-xs tracking-[0.25em] text-white/40 uppercase">
                    Mode
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    All day
                  </p>
                  <p className="text-xs text-white/55">
                    Ignores start & end times
                  </p>
                </div>
                <Switch
                  checked={formValues.allDay}
                  onCheckedChange={(checked) => updateForm("allDay", checked)}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.35em] text-white/40 uppercase">
                Sections
              </p>
              <div className="flex flex-wrap gap-3">
                {SECTION_TABS.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    className={cn(
                      tabButtonBase,
                      activeSection === section.key
                        ? "border-primary/60 bg-primary/10 text-white"
                        : "backdrop-blur-sm",
                    )}
                    onClick={() => setActiveSection(section.key)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                {activeSection === "details" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm text-white/70">Team</Label>
                        <Select
                          value={formValues.team}
                          onValueChange={(value) => updateForm("team", value)}
                        >
                          <SelectTrigger
                            className={cn(baseField, "h-11")}
                            aria-label="Team"
                          >
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEAM_OPTIONS.map((team) => (
                              <SelectItem key={team} value={team.toLowerCase()}>
                                {team}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-white/70">
                          Priority
                        </Label>
                        <Select
                          value={formValues.priority}
                          onValueChange={(value) =>
                            updateForm("priority", value)
                          }
                        >
                          <SelectTrigger
                            className={cn(baseField, "h-11")}
                            aria-label="Priority"
                          >
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((priority) => (
                              <SelectItem
                                key={priority}
                                value={priority.toLowerCase()}
                              >
                                {priority}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor={`${baseId}-details`}
                        className="text-sm text-white/70"
                      >
                        Description
                      </Label>
                      <Textarea
                        id={`${baseId}-details`}
                        className={cn(
                          baseField,
                          "min-h-[140px] resize-none text-base leading-relaxed",
                        )}
                        placeholder="Approve design system updates, outline agenda, attach quick summary."
                        value={formValues.details}
                        onChange={(event) =>
                          updateForm("details", event.target.value)
                        }
                      />
                    </div>

                    <div className="flex items-start justify-between rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                      <div>
                        <p className="text-xs tracking-[0.25em] text-white/40 uppercase">
                          Visibility
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">
                          Hackathon critical
                        </p>
                        <p className="text-xs text-white/55">
                          High visibility during hackathon mode
                        </p>
                      </div>
                      <Switch
                        checked={formValues.isHackathonCritical}
                        onCheckedChange={(checked) =>
                          updateForm("isHackathonCritical", checked)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {activeSection === "requirements" && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                      <div>
                        <p className="text-xs tracking-[0.25em] text-white/40 uppercase">
                          Room Booking
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">
                          Room needed for this event
                        </p>
                      </div>
                      <Switch
                        checked={formValues.requiresRoom}
                        onCheckedChange={(checked) =>
                          updateForm("requiresRoom", checked)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <p className="text-xs tracking-[0.25em] text-white/40 uppercase">
                        Requirements
                      </p>
                      <div className="mt-4 space-y-4">
                        {REQUIREMENT_FLAGS.map((flag) => (
                          <div
                            key={flag.key}
                            className="bg-white/5/20 flex items-start justify-between rounded-2xl border border-white/10 p-3"
                          >
                            <div className="pr-4">
                              <p className="text-base font-medium text-white">
                                {flag.label}
                              </p>
                              <p className="text-xs text-white/55">
                                {flag.caption}
                              </p>
                            </div>
                            <Switch
                              checked={formValues[flag.key]}
                              onCheckedChange={(checked) =>
                                updateForm(flag.key, checked)
                              }
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "links" && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Label className="text-sm text-white/70">Links</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 rounded-full border border-white/15 bg-transparent px-4 text-xs font-semibold text-white/80 hover:border-white/30 hover:bg-white/5"
                        onClick={handleAddLink}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add Link
                      </Button>
                    </div>
                    {formValues.links.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/60">
                        No links added. Click "Add Link" to include Notion docs,
                        Figma files, or sign-up forms.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {formValues.links.map((link) => (
                          <div
                            key={link.id}
                            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:flex-row"
                          >
                            <div className="flex-1 space-y-2">
                              <Input
                                className={cn(baseField, "h-11")}
                                placeholder="Label (e.g., Notion doc)"
                                value={link.label}
                                onChange={(event) =>
                                  handleLinkUpdate(
                                    link.id,
                                    "label",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="flex flex-1 gap-3">
                              <div className="relative flex-1">
                                <Link2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
                                <Input
                                  className={cn(baseField, "h-11 pl-9")}
                                  placeholder="URL"
                                  type="url"
                                  value={link.url}
                                  onChange={(event) =>
                                    handleLinkUpdate(
                                      link.id,
                                      "url",
                                      event.target.value,
                                    )
                                  }
                                />
                              </div>
                              <Button
                                variant="ghost"
                                type="button"
                                className="h-11 w-11 rounded-2xl border border-white/10 bg-transparent text-white/70 hover:border-white/30 hover:text-white"
                                onClick={() => handleRemoveLink(link.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label
                        htmlFor={`${baseId}-notes`}
                        className="text-sm text-white/70"
                      >
                        Additional notes
                      </Label>
                      <Textarea
                        id={`${baseId}-notes`}
                        className={cn(
                          baseField,
                          "min-h-[140px] resize-none leading-relaxed",
                        )}
                        placeholder="Any other context teammates should know before kicking off."
                        value={formValues.notes}
                        onChange={(event) =>
                          updateForm("notes", event.target.value)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-6 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {intent === "edit" && (
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}

            <div
              className={cn(
                "flex flex-col gap-3 sm:flex-row",
                intent !== "edit" && "sm:ml-auto",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                className="w-full border border-white/10 bg-transparent text-white/80 hover:border-white/30 hover:bg-white/5 sm:w-auto"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                {intent === "edit" ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </div>
        </footer>
      </form>
    </div>,
    portalElement,
  );
}

function formatDateForInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTimeForInput(date: Date) {
  return date.toTimeString().slice(0, 5);
}
