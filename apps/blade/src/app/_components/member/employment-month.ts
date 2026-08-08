const CANONICAL_EMPLOYMENT_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const PARTIAL_EMPLOYMENT_MONTH = /^(?:--(0[1-9]|1[0-2])|(\d{4})-)$/;

export function employmentMonthParts(value: string | null) {
  const canonical = CANONICAL_EMPLOYMENT_MONTH.exec(value ?? "");
  if (canonical) {
    return {
      month: canonical[2] ?? "",
      year: canonical[1] ?? "",
    };
  }

  const partial = PARTIAL_EMPLOYMENT_MONTH.exec(value ?? "");
  return {
    month: partial?.[1] ?? "",
    year: partial?.[2] ?? "",
  };
}

/**
 * A partial value exists only in the client draft so selecting either control
 * immediately makes the form dirty. Validation blocks it from reaching the
 * mutation; a complete selection is always emitted as canonical `YYYY-MM`.
 */
export function employmentMonthDraftValue(month: string, year: string) {
  const validMonth = /^(0[1-9]|1[0-2])$/.test(month);
  const validYear = /^\d{4}$/.test(year);
  if ((month && !validMonth) || (year && !validYear)) return null;
  if (validMonth && validYear) return `${year}-${month}`;
  if (validMonth) return `--${month}`;
  if (validYear) return `${year}-`;
  return null;
}

export function isPartialEmploymentMonth(value: string | null | undefined) {
  return PARTIAL_EMPLOYMENT_MONTH.test(value ?? "");
}
