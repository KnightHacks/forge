import type {
  TRPCMutationProcedure,
  TRPCQueryProcedure,
  TRPCRouterRecord,
} from "@trpc/server";

import type { FORMS } from "@forge/consts";
import type {
  SelectEvent,
  SelectHackathon,
  SelectHacker,
  SelectMember,
} from "@forge/db/schemas/knight-hacks";
import type { HackerApplicationWireInput } from "@forge/validators";

type HackerStatus = (typeof FORMS.HACKATHON_APPLICATION_STATES)[number];
interface HackathonInput {
  hackathonName: string;
}
interface ProcedureDef<TInput, TOutput> {
  input: TInput;
  output: TOutput;
  meta: unknown;
}
type Query<TInput, TOutput> = TRPCQueryProcedure<ProcedureDef<TInput, TOutput>>;
type Mutation<TInput, TOutput> = TRPCMutationProcedure<
  ProcedureDef<TInput, TOutput>
>;

export type Participant = SelectHacker & {
  status: HackerStatus;
  points: number;
  timeApplied: Date;
  timeConfirmed: Date | null;
};

export type PublicHackathon = Pick<
  SelectHackathon,
  | "name"
  | "displayName"
  | "theme"
  | "applicationBackgroundEnabled"
  | "applicationBackgroundKey"
  | "applicationOpen"
  | "applicationDeadline"
  | "startDate"
  | "endDate"
>;

export interface ParticipantDashboard {
  confirmedCount: number;
  hackathon: SelectHackathon;
  participant: Participant | null;
  pastHackathons: {
    id: string;
    name: string;
    displayName: string;
    startDate: Date;
    endDate: Date;
    status: HackerStatus;
  }[];
}

export interface ParticipantApplicationContext {
  existingApplication: Participant | null;
  hackathon: SelectHackathon;
  memberProfile: SelectMember | null;
  previousHacker: SelectHacker | null;
}

export type ParticipantScheduleEvent = Pick<
  SelectEvent,
  "id" | "name" | "description" | "tag" | "location" | "points"
> & {
  startDateTime: Date;
  endDateTime: Date;
};

export interface ParticipantPortalContract {
  getHackathon: Query<HackathonInput, PublicHackathon>;
  getDashboard: Query<HackathonInput, ParticipantDashboard>;
  getApplicationContext: Query<HackathonInput, ParticipantApplicationContext>;
  submitApplication: Mutation<
    HackerApplicationWireInput & HackathonInput,
    void
  >;
  updateProfile: Mutation<
    HackerApplicationWireInput & HackathonInput,
    Participant | null
  >;
  uploadResume: Mutation<
    HackathonInput & { fileName: string; fileContent: string },
    string
  >;
  getResume: Query<HackathonInput, { url: string | null }>;
  confirmAttendance: Mutation<HackathonInput, { status: "confirmed" }>;
  withdrawAttendance: Mutation<HackathonInput, { status: "withdrawn" }>;
  getQRCode: Query<HackathonInput, { qrCodeUrl: string }>;
  getSchedule: Query<HackathonInput, ParticipantScheduleEvent[]>;
  reportIssue: Mutation<
    HackathonInput & { description: string },
    { submitted: true }
  >;
}

export type ParticipantPortalRouterRecord = ParticipantPortalContract &
  TRPCRouterRecord;
