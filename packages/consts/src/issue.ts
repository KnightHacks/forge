export const ISSUE_STATUS = [
  "BACKLOG",
  "PLANNING",
  "IN_PROGRESS",
  "FINISHED",
] as const;

export const PRIORITY = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"] as const;

export const STATUS_COLORS: Record<(typeof ISSUE_STATUS)[number], string> = {
  BACKLOG: "bg-slate-400",
  PLANNING: "bg-amber-400",
  IN_PROGRESS: "bg-emerald-400",
  FINISHED: "bg-rose-400",
};

export const TASK_DUE_HOURS = 23;
export const TASK_DUE_MINUTES = 0;
export const TASK_DUE_TIME = "23:00";

export const EVENT_TIME_HOURS = Array.from({ length: 12 }, (_, i) =>
  (i + 1).toString().padStart(2, "0"),
);
export const EVENT_TIME_MINUTES = Array.from({ length: 12 }, (_, i) =>
  (i * 5).toString().padStart(2, "0"),
);
export const EVENT_TIME_AM_PM_OPTIONS = ["AM", "PM"] as const;

export type StatusFilter = "all" | (typeof ISSUE_STATUS)[number];
export type IssueKindFilter = "all" | "task" | "event_linked";

export interface IssueFilters {
  statusFilter: StatusFilter;
  teamFilter: string;
  searchTerm: string;
  dateFrom: string;
  dateTo: string;
  rootOnly: boolean;
  issueKind: IssueKindFilter;
}

export interface IssueFetcherPaneIssue {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: (typeof ISSUE_STATUS)[number];
  name: string;
  description: string;
  links: string[] | null;
  event: string | null;
  date: Date | null;
  priority: (typeof PRIORITY)[number];
  team: string;
  parent: string | null;
  creator: string;
  teamVisibility: { teamId: string }[];
  userAssignments: { userId: string }[];
}

export interface IssueFetcherPaneData {
  issues: IssueFetcherPaneIssue[];
  blockedParentIds: Set<string>;
  roleNameById: Map<string, string>;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  filters: IssueFilters;
}

export const DEFAULT_ISSUE_FILTERS: IssueFilters = {
  statusFilter: "all",
  teamFilter: "all",
  searchTerm: "",
  dateFrom: "",
  dateTo: "",
  rootOnly: true,
  issueKind: "all",
};

// Dialog

export interface CreateEditDialogProps {
  open: boolean;
  intent?: "create" | "edit";
  initialValues?: Partial<IssueSubmitValues>;
  onClose?: () => void;
  onSubmit?: (values: IssueSubmitValues) => void;
  onDelete?: (values: IssueSubmitValues) => void;
}

type IssueStatus = (typeof ISSUE_STATUS)[number];
type IssuePriority = (typeof PRIORITY)[number];
export type UUID = string;

export interface IssueEditNode {
  clientId: string;
  id?: string;
  status: IssueStatus;
  name: string;
  description: string;
  links: string[];
  date?: Date;
  priority: IssuePriority;
  team: string;
  parent?: string;
  isEvent: boolean;
  event?: UUID | null;
  eventData?: EventFormValues;
  roles: string[];
  assigneeIds?: string[];
  children: IssueEditNode[];
}

export interface IssueSubmitNode {
  status: IssueStatus;
  name: string;
  description: string;
  links: string[];
  date: string | Date;
  priority: IssuePriority;
  team: string;
  event?: string | null;
  teamVisibilityIds?: string[];
  assigneeIds?: string[];
  children?: IssueSubmitNode[];
}

export interface IssueSubmitValues {
  id?: string;
  status: IssueStatus;
  name: string;
  description: string;
  links: string[];
  date: string | Date;
  priority: IssuePriority;
  team: string;
  parent?: string;
  isEvent: boolean;
  event?: UUID | null;
  eventData?: EventFormValues;
  teamVisibilityIds?: string[];
  assigneeIds?: string[];
  children?: IssueSubmitNode[];
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
  roles?: string[];
  dues_paying: boolean;
  isOperationsCalendar?: boolean;
  discordChannelId?: string;
  points?: number;
  hackathonId?: string;
}
export interface IssueTemplate {
  title: string;
  description?: string;
  team?: string;
  assignee?: string;
  dateMs?: number;
  children?: IssueTemplate[];
}

export interface IssueTemplateEditNode {
  clientId: string;
  name: string;
  description: string;
  team: string;
  daysOffset?: number;
  children: IssueTemplateEditNode[];
}
