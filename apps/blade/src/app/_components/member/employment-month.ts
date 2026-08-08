const CANONICAL_EMPLOYMENT_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function employmentMonthParts(value: string | null) {
  const match = CANONICAL_EMPLOYMENT_MONTH.exec(value ?? "");
  return {
    month: match?.[2] ?? "",
    year: match?.[1] ?? "",
  };
}

export function employmentMonthValue(month: string, year: string) {
  return /^(0[1-9]|1[0-2])$/.test(month) && /^\d{4}$/.test(year)
    ? `${year}-${month}`
    : null;
}
