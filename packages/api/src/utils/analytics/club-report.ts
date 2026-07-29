import type { AnalyticsReportInput } from "@forge/validators";
import { eq, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  DuesPayment,
  Event,
  EventAttendee,
  EventFeedbackConfig,
  FormResponse,
  Member,
} from "@forge/db/schemas/knight-hacks";

import { buildClubAnalyticsReport } from "./report";

/**
 * Reads every source row the Club report is derived from. Hackathon events are
 * excluded here so no downstream metric has to remember to filter them.
 */
async function loadClubAnalyticsSources() {
  const [members, events, attendances, dues, feedback] = await Promise.all([
    db
      .select({
        age: Member.age,
        dateCreated: Member.dateCreated,
        firstName: Member.firstName,
        gender: Member.gender,
        gradDate: Member.gradDate,
        id: Member.id,
        lastName: Member.lastName,
        levelOfStudy: Member.levelOfStudy,
        major: Member.major,
        points: Member.points,
        raceOrEthnicity: Member.raceOrEthnicity,
        school: Member.school,
        shirtSize: Member.shirtSize,
      })
      .from(Member),
    db
      .select({
        endAt: Event.end_datetime,
        hackathonId: Event.hackathonId,
        id: Event.id,
        location: Event.location,
        name: Event.name,
        startAt: Event.start_datetime,
        tag: Event.tag,
      })
      .from(Event)
      .where(isNull(Event.hackathonId)),
    db
      .select({
        eventId: EventAttendee.eventId,
        memberId: EventAttendee.memberId,
      })
      .from(EventAttendee)
      .innerJoin(Event, eq(EventAttendee.eventId, Event.id))
      .where(isNull(Event.hackathonId)),
    db
      .select({
        active: DuesPayment.active,
        id: DuesPayment.id,
        memberId: DuesPayment.memberId,
        paymentDate: DuesPayment.paymentDate,
        year: DuesPayment.year,
      })
      .from(DuesPayment),
    db
      .select({
        answers: FormResponse.responseData,
        eventId: EventFeedbackConfig.eventId,
        memberId: Member.id,
        responseId: FormResponse.id,
      })
      .from(FormResponse)
      .innerJoin(
        EventFeedbackConfig,
        eq(FormResponse.form, EventFeedbackConfig.formId),
      )
      .innerJoin(Event, eq(EventFeedbackConfig.eventId, Event.id))
      .leftJoin(Member, eq(FormResponse.userId, Member.userId))
      .where(isNull(Event.hackathonId)),
  ]);

  return { attendances, dues, events, feedback, members };
}

/** Returns the complete read-only Club analytics report; source rows never escape. */
export async function getClubAnalyticsReport(input: AnalyticsReportInput) {
  const sources = await loadClubAnalyticsSources();
  return buildClubAnalyticsReport({
    ...sources,
    input,
    referenceDate: new Date(),
  });
}
