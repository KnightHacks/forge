export const ISSUE_STATUS = [
  "BACKLOG",
  "PLANNING",
  "IN_PROGRESS",
  "FINISHED",
] as const;

export const PRIORITY = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"] as const;

//Dialog

export interface CreateEditDialogProps {
  open: boolean;
  intent?: "create" | "edit";
  initialValues?: Partial<IssueFormValues>;
  onClose?: () => void;
  onSubmit?: (values: IssueFormValues) => void;
  onDelete?: (values: IssueFormValues) => void;
}

export type DetailSectionKey = "details" | "requirements" | "links";

const SECTION_TABS: { key: DetailSectionKey; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "requirements", label: "Room & Requirements" },
  { key: "links", label: "Links & Notes" },
];

type IssueStatus = (typeof ISSUE_STATUS)[number];
type IssuePriority = (typeof PRIORITY)[number];

export interface IssueFormValues {
  status: IssueStatus;
  name: string;
  description: string;
  links: string[];
  date: string; // ISO string
  priority: IssuePriority;
  team: string;
  parent?: string;
  isEvent: boolean;
  event?: EventFormValues;
  // Added fields for UI requirements
  details: string;
  notes: string;
  isHackathonCritical: boolean;
  requiresRoom: boolean;
  requiresAV: boolean;
  requiresFood: boolean;
}

export interface EventFormValues {
  discordId: string;
  googleId: string;
  name: string;
  tag: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  dues_paying: boolean;
  points?: number;
  hackathonId?: string;
}
