import { NextResponse } from "next/server";

import { and, eq } from "@forge/db";
import { db } from "@forge/db/client";
import {
  DuesEntitlement,
  DuesPayment,
  Member,
} from "@forge/db/schemas/knight-hacks";
import {
  getDuesAcademicYear,
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
  await db.transaction(async (tx) => {
    const existingEntitlement = await tx.query.DuesEntitlement.findFirst({
      where: and(
        eq(DuesEntitlement.memberId, member.id),
        eq(DuesEntitlement.year, currentAcademicYear.startYear),
        eq(DuesEntitlement.active, true),
      ),
    });
    if (existingEntitlement) return;

    const paymentDate = new Date();
    const [payment] = await tx
      .insert(DuesPayment)
      .values({
        amount: MEMBER_DUES_PRICE_CENTS,
        memberId: member.id,
        paymentDate,
        stripePaymentIntentId: `pi_e2e_${crypto.randomUUID()}`,
        year: currentAcademicYear.startYear,
      })
      .returning({ id: DuesPayment.id });
    if (!payment) throw new Error("Failed to record E2E dues payment.");
    await tx
      .insert(DuesEntitlement)
      .values({
        active: true,
        createdAt: paymentDate,
        memberId: member.id,
        sourcePaymentId: payment.id,
        updatedAt: paymentDate,
        year: currentAcademicYear.startYear,
      })
      .onConflictDoUpdate({
        set: {
          active: true,
          sourcePaymentId: payment.id,
          updatedAt: paymentDate,
        },
        setWhere: eq(DuesEntitlement.active, false),
        target: [DuesEntitlement.memberId, DuesEntitlement.year],
      });
  });

  return NextResponse.json({ paid: true });
}
