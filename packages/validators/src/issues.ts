import { z } from "zod";

import { EVENTS, ISSUE } from "@forge/consts";

const uuid = z.string().uuid();
const issueDateTime = z.iso.datetime({ offset: true });

const uniqueUuidArray = (maximum: number) =>
  z
    .array(uuid)
    .max(maximum)
    .superRefine((values, context) => {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: "IDs must not contain duplicates.",
        });
      }
    });

export const issueStatusSchema = z.enum(ISSUE.ISSUE_STATUS);
export const issuePrioritySchema = z.enum(ISSUE.PRIORITY);

export function normalizeIssueLinks(values: readonly string[]) {
  const presentValues = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (presentValues.length > 20)
    throw new Error("An issue may have at most 20 links.");

  const normalized = presentValues.map((trimmed) => {
    if (trimmed.length > 2_048) {
      throw new Error("Links may contain at most 2,048 characters.");
    }
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Links must use HTTP or HTTPS.");
    }
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  });

  return [...new Set(normalized)];
}

const issueLinksSchema = z
  .array(z.string())
  .default([])
  .transform((values, context) => {
    try {
      return normalizeIssueLinks(values);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Invalid link.",
      });
      return z.NEVER;
    }
  });

const issueFieldsSchema = z.object({
  assigneeIds: uniqueUuidArray(50).default([]),
  description: z.string().trim().min(1).max(20_000),
  dueAt: issueDateTime.nullable().optional(),
  eventId: uuid.nullable().optional(),
  links: issueLinksSchema,
  name: z.string().trim().min(1).max(200),
  priority: issuePrioritySchema,
  status: issueStatusSchema,
  team: uuid,
  teamVisibilityIds: uniqueUuidArray(50).default([]),
});

export type IssueCreateNode = z.infer<typeof issueFieldsSchema> & {
  children?: IssueCreateNode[];
};

const issueCreateNodeSchema: z.ZodType<IssueCreateNode> =
  issueFieldsSchema.extend({
    children: z.lazy(() => z.array(issueCreateNodeSchema)).default([]),
  });

function validateIssueTree(
  node: IssueCreateNode,
  context: z.RefinementCtx,
  depth = 1,
) {
  let count = 1;
  if (depth > 5) {
    context.addIssue({
      code: "custom",
      message: "Issue trees may be at most five levels deep.",
      path: ["children"],
    });
  }
  for (const child of node.children ?? []) {
    count += validateIssueTree(child, context, depth + 1);
  }
  return count;
}

export const issueCreateSchema = issueFieldsSchema
  .extend({
    children: z.array(issueCreateNodeSchema).default([]),
    creationKey: uuid,
    parentId: uuid.optional(),
  })
  .superRefine((value, context) => {
    if (validateIssueTree(value, context) > 100) {
      context.addIssue({
        code: "custom",
        message: "Issue trees may contain at most 100 issues.",
        path: ["children"],
      });
    }
  });

export const issueUpdateSchema = z
  .object({
    assigneeIds: uniqueUuidArray(50).optional(),
    description: z.string().trim().min(1).max(20_000).optional(),
    dueAt: issueDateTime.nullable().optional(),
    eventId: uuid.nullable().optional(),
    expectedRevision: z.number().int().positive(),
    id: uuid,
    links: issueLinksSchema.optional(),
    name: z.string().trim().min(1).max(200).optional(),
    parentId: uuid.nullable().optional(),
    priority: issuePrioritySchema.optional(),
    status: issueStatusSchema.optional(),
    teamVisibilityIds: uniqueUuidArray(50).optional(),
  })
  .strict();

export const issueIdSchema = z.object({ id: uuid }).strict();

export const issueRevisionSchema = issueIdSchema.extend({
  expectedRevision: z.number().int().positive(),
});

export const issueRestoreSchema = issueRevisionSchema.extend({
  archiveBatchId: uuid,
});

export const issueListPageSizes = [25, 50, 100] as const;
export const issueListQuerySchema = z
  .object({
    archived: z.boolean().default(false),
    assigneeIds: uniqueUuidArray(50).default([]),
    calendarEnd: issueDateTime.optional(),
    calendarStart: issueDateTime.optional(),
    cursor: uuid.optional(),
    dueAfter: issueDateTime.optional(),
    dueBefore: issueDateTime.optional(),
    eventLink: z.enum(["any", "linked", "unlinked"]).default("any"),
    page: z.number().int().positive().default(1),
    pageSize: z
      .union([z.literal(25), z.literal(50), z.literal(100)])
      .default(25),
    priorities: z.array(issuePrioritySchema).max(5).default([]),
    rootOnly: z.boolean().default(false),
    search: z.string().trim().max(200).default(""),
    sortDirection: z.enum(["asc", "desc"]).default("asc"),
    sortField: z
      .enum(["dueAt", "name", "priority", "status", "updatedAt"])
      .default("dueAt"),
    statuses: z.array(issueStatusSchema).max(4).default([]),
    teamIds: uniqueUuidArray(50).default([]),
    view: z.enum(["calendar", "kanban", "list"]).default("list"),
  })
  .superRefine((value, context) => {
    if (
      value.dueAfter &&
      value.dueBefore &&
      new Date(value.dueBefore) <= new Date(value.dueAfter)
    ) {
      context.addIssue({
        code: "custom",
        message: "Due-before must be after due-after.",
        path: ["dueBefore"],
      });
    }
    if (value.view !== "calendar") return;
    if (!value.calendarStart || !value.calendarEnd) {
      context.addIssue({
        code: "custom",
        message: "Calendar views require a start and end instant.",
        path: ["calendarStart"],
      });
      return;
    }
    const start = new Date(value.calendarStart);
    const end = new Date(value.calendarEnd);
    if (end <= start) {
      context.addIssue({
        code: "custom",
        message: "Calendar end must be after its start.",
        path: ["calendarEnd"],
      });
      return;
    }
    if (end.getTime() - start.getTime() > 62 * 24 * 60 * 60 * 1_000) {
      context.addIssue({
        code: "custom",
        message: "Calendar windows may span at most 62 days.",
        path: ["calendarEnd"],
      });
    }
  });

const templateTokenPattern = /\{([^{}]+)\}/g;

const templateText = z
  .string()
  .max(20_000)
  .superRefine((value, context) => {
    for (const match of value.matchAll(templateTokenPattern)) {
      if (match[1] !== "INPUT" && match[1] !== "PARENT") {
        context.addIssue({
          code: "custom",
          message: `Unsupported template token {${match[1]}}.`,
        });
      }
    }
  });

export interface IssueTemplateNode {
  assigneeIds?: string[];
  children?: IssueTemplateNode[];
  description: string;
  name: string;
  priority: z.infer<typeof issuePrioritySchema>;
  relativeDueDays?: number;
  status: z.infer<typeof issueStatusSchema>;
  team: string;
  teamVisibilityIds?: string[];
}

const issueTemplateNodeSchema: z.ZodType<IssueTemplateNode> = z.object({
  assigneeIds: uniqueUuidArray(50).optional(),
  children: z.lazy(() => z.array(issueTemplateNodeSchema)).default([]),
  description: templateText.default("{INPUT}"),
  name: templateText.min(1).max(200),
  priority: issuePrioritySchema,
  relativeDueDays: z.number().int().min(-365).max(3_650).optional(),
  status: issueStatusSchema,
  team: uuid,
  teamVisibilityIds: uniqueUuidArray(50).optional(),
});

function displayTemplateName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export const issueTemplateCreateSchema = z
  .object({
    body: issueTemplateNodeSchema,
    name: z.string().trim().min(1).max(100),
  })
  .transform((value) => {
    const name = displayTemplateName(value.name);
    return {
      ...value,
      name,
      normalizedName: name.toLocaleLowerCase("en-US"),
    };
  })
  .superRefine((value, context) => {
    if (validateIssueTree(value.body as IssueCreateNode, context) > 100) {
      context.addIssue({
        code: "custom",
        message: "Template trees may contain at most 100 issues.",
        path: ["body"],
      });
    }
  });

export const issueTemplateUpdateSchema = issueTemplateCreateSchema.and(
  z.object({ id: uuid }).strict(),
);

function timeZoneOffsetMilliseconds(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(instant);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return (
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour) % 24,
      Number(values.minute),
      Number(values.second),
    ) - instant.getTime()
  );
}

export function defaultIssueDueAt(date: string, time = ISSUE.TASK_DUE_TIME) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match || !timeMatch) throw new Error("Enter a valid date and time.");
  const localAsUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );
  let candidate = new Date(localAsUtc);
  for (let iteration = 0; iteration < 2; iteration += 1) {
    candidate = new Date(
      localAsUtc -
        timeZoneOffsetMilliseconds(candidate, EVENTS.CALENDAR_TIME_ZONE),
    );
  }
  return candidate.toISOString();
}

export type IssueCreateInput = z.infer<typeof issueCreateSchema>;
export type IssueListInput = z.infer<typeof issueListQuerySchema>;
export type IssueUpdateInput = z.infer<typeof issueUpdateSchema>;
