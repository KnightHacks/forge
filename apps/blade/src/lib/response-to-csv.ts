export function responsesToCsv(
  responses: {
    submittedAt: Date | string;
    responseData: Record<string, unknown>;
    member?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  }[],
  questionOrder?: string[]
) {
  if (!responses.length) return "";

  const allQuestions = questionOrder?.length
    ? questionOrder
    : Array.from(new Set(responses.flatMap((r) => Object.keys(r.responseData))));

  const headers = ["First Name", "Last Name", "Email", "Submitted At", ...allQuestions];

  const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const rows = responses.map((r) => {
    const row: string[] = [];
    row.push(quote(String(r.member?.firstName ?? "")));
    row.push(quote(String(r.member?.lastName ?? "")));
    row.push(quote(String(r.member?.email ?? "")));
    row.push(quote(new Date(r.submittedAt).toISOString()));

    for (const q of allQuestions) {
      let val = r.responseData[q];
      if (Array.isArray(val)) val = val.join(", ");
      row.push(quote(val?.toString() ?? ""));
    }

    return row.join(",");
  });

  const quotedHeaders = headers.map((h) => quote(String(h))).join(",");
  return [quotedHeaders, ...rows].join("\n");
}
