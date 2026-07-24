import { TRPCError } from "@trpc/server";

import type { InsertEmployment } from "@forge/db/schemas/knight-hacks";
import type { EmploymentInput } from "@forge/validators";
import { eq } from "@forge/db";
import { Company, Employment } from "@forge/db/schemas/knight-hacks";
import { normalizeCompanyName } from "@forge/validators";

import type { WriteDb } from "../db";
import { hasUsCity } from "./us-cities";

function companyIsAvailable(
  company: {
    createdByUserId: string | null;
    reviewState: "pending" | "approved" | "rejected" | "merged";
  },
  userId: string,
) {
  return (
    company.reviewState === "approved" || company.createdByUserId === userId
  );
}

async function resolveCompanyId({
  database,
  employment,
  userId,
}: {
  database: WriteDb;
  employment: EmploymentInput;
  userId: string;
}) {
  if (employment.companyId) {
    const company = await database.query.Company.findFirst({
      where: eq(Company.id, employment.companyId),
    });
    if (!company || !companyIsAvailable(company, userId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more companies are no longer available.",
      });
    }
    return company.id;
  }

  if (!employment.proposedCompanyName) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose an existing company or enter a new one.",
    });
  }

  const normalizedDisplayName = normalizeCompanyName(
    employment.proposedCompanyName,
  );
  const existing = await database.query.Company.findFirst({
    where: eq(Company.normalizedDisplayName, normalizedDisplayName),
  });
  if (existing) {
    if (!companyIsAvailable(existing, userId)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "That company already exists or is awaiting officer review.",
      });
    }
    return existing.id;
  }

  const [company] = await database
    .insert(Company)
    .values({
      createdByUserId: userId,
      displayName: employment.proposedCompanyName,
      normalizedDisplayName,
      reviewState: "pending",
    })
    .returning();
  if (!company) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Company could not be created.",
    });
  }
  return company.id;
}

async function prepareEmploymentRows({
  database,
  employmentHistory,
  memberId,
  userId,
}: {
  database: WriteDb;
  employmentHistory: EmploymentInput[];
  memberId: string;
  userId: string;
}) {
  const invalidCity = employmentHistory.find(
    (employment) =>
      employment.cityKey !== null && !hasUsCity(employment.cityKey),
  );
  if (invalidCity) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose a city from the U.S. city search.",
    });
  }

  const companyIdsByProposal = new Map<string, string>();
  const rows: InsertEmployment[] = [];
  for (const employment of employmentHistory) {
    const proposalKey = employment.proposedCompanyName
      ? normalizeCompanyName(employment.proposedCompanyName)
      : null;
    let companyId = proposalKey
      ? companyIdsByProposal.get(proposalKey)
      : undefined;
    if (!companyId) {
      companyId = await resolveCompanyId({ database, employment, userId });
      if (proposalKey) companyIdsByProposal.set(proposalKey, companyId);
    }

    rows.push({
      cityKey: employment.cityKey,
      companyId,
      endMonth: employment.endMonth,
      experienceType: employment.experienceType,
      guildVisible: employment.guildVisible,
      memberId,
      startMonth: employment.startMonth,
      state: employment.state,
      title: employment.title,
    });
  }
  return rows;
}

export async function createEmploymentHistory({
  database,
  employmentHistory,
  memberId,
  userId,
}: {
  database: WriteDb;
  employmentHistory: EmploymentInput[];
  memberId: string;
  userId: string;
}) {
  const rows = await prepareEmploymentRows({
    database,
    employmentHistory,
    memberId,
    userId,
  });
  if (rows.length === 0) return [];
  return await database.insert(Employment).values(rows).returning();
}

export async function replaceEmploymentHistory({
  database,
  employmentHistory,
  memberId,
  userId,
}: {
  database: WriteDb;
  employmentHistory: EmploymentInput[];
  memberId: string;
  userId: string;
}) {
  const rows = await prepareEmploymentRows({
    database,
    employmentHistory,
    memberId,
    userId,
  });
  await database.delete(Employment).where(eq(Employment.memberId, memberId));
  if (rows.length === 0) return [];
  return await database.insert(Employment).values(rows).returning();
}
