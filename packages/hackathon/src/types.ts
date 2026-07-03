import type {
  Participant,
  ParticipantApplicationContext,
  ParticipantDashboard,
  ParticipantScheduleEvent,
} from "@forge/api/participant";
import type { FORMS } from "@forge/consts";
import type { HackerApplicationWireInput } from "@forge/validators";

export type HackerStatus = (typeof FORMS.HACKATHON_APPLICATION_STATES)[number];

export type PortalParticipant = Participant;
export type PortalDashboardData = ParticipantDashboard;
export type PortalApplicationContext = ParticipantApplicationContext;

export type PortalApplicationInput = HackerApplicationWireInput;

export type PortalScheduleEvent = ParticipantScheduleEvent;
