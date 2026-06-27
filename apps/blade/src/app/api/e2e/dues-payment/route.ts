import { NextResponse } from "next/server";

import { and, desc, eq } from "@forge/db";
import { db } from "@forge/db/client";
import { DuesPayment, Member } from "@forge/db/schemas/knight-hacks";
import {
  getDuesAcademicYear,
  getDuesPayableYear,
  MEMBER_DUES_PRICE_CENTS,
} from "@forge/validators";

import { auth, isE2EAuthEnabled } from "~/server/auth";

export async function POST() {
  if (!isE2EAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await db.query.Member.findFirst({
    where: eq(Member.userId, session.user.id),
    columns: {
      id: true,
    },
  });

  if (!member) {
    return NextResponse.json(
      { error: "Create a member profile before paying dues." },
      { status: 404 },
    );
  }

  const currentAcademicYear = getDuesAcademicYear();
  const currentRows = await db
    .select({
      active: DuesPayment.active,
      year: DuesPayment.year,
    })
    .from(DuesPayment)
    .where(
      and(
        eq(DuesPayment.memberId, member.id),
        eq(DuesPayment.year, currentAcademicYear.startYear),
      ),
    )
    .orderBy(desc(DuesPayment.paymentDate));
  const payableYear = getDuesPayableYear({
    currentAcademicYearStart: currentAcademicYear.startYear,
    hasStaleCurrentYearDues: currentRows.some((row) => !row.active),
  });

  const existingActivePayment = await db.query.DuesPayment.findFirst({
    where: and(
      eq(DuesPayment.memberId, member.id),
      eq(DuesPayment.year, payableYear),
      eq(DuesPayment.active, true),
    ),
  });

  if (existingActivePayment) {
    return NextResponse.json({ paid: true });
  }

  await db
    .insert(DuesPayment)
    .values({
      active: true,
      amount: MEMBER_DUES_PRICE_CENTS,
      memberId: member.id,
      paymentDate: new Date(),
      stripePaymentIntentId: `pi_e2e_${crypto.randomUUID()}`,
      year: payableYear,
    })
    .onConflictDoNothing();

  return NextResponse.json({ paid: true });
}
