function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );
}

/**
 * Sent to a hacker when an organizer changes their 3D print job's status.
 * `readyAt` is already formatted in the hackathon's time zone; `portalUrl` is
 * the printing page, or null when the hackathon has no portal.
 */
export function printJobStatusEmail(input: {
  hackathonName: string;
  headline: string;
  name: string;
  note: string | null;
  portalUrl: string | null;
  readyAt: string | null;
  statusLabel: string;
}) {
  const hackathonName = escapeHtml(input.hackathonName);
  const headline = escapeHtml(input.headline);
  const name = escapeHtml(input.name);
  const statusLabel = escapeHtml(input.statusLabel);
  const subject = `${input.hackathonName} 3D printing: ${input.statusLabel}`;

  const text = [
    `Hi ${input.name},`,
    "",
    `${input.headline} Your 3D print job is now: ${input.statusLabel}.`,
    input.note ? `\nNote from the organizers: ${input.note}` : null,
    input.readyAt ? `\nEstimated ready: about ${input.readyAt}` : null,
    input.portalUrl ? `\nTrack your print: ${input.portalUrl}` : null,
    "",
    "Knight Hacks",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const note = input.note
    ? `<div style="background:#f4f1fa;border-left:4px solid #7143b8;padding:18px 20px;margin:24px 0"><div style="font-size:11px;color:#62556e;letter-spacing:1px">NOTE FROM THE ORGANIZERS</div><div style="font-size:16px;line-height:1.6;margin-top:8px;overflow-wrap:anywhere">${escapeHtml(input.note)}</div></div>`
    : "";
  const readyAt = input.readyAt
    ? `<p style="font-size:16px;line-height:1.6">Estimated ready: <strong>about ${escapeHtml(input.readyAt)}</strong>. Estimates move as the queue moves.</p>`
    : "";
  const button = input.portalUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#6535a4"><a href="${escapeHtml(input.portalUrl)}" style="display:inline-block;padding:16px 24px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none">Track your print &rarr;</a></td></tr></table>`
    : "";

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8"></head><body style="margin:0;background:#f2f0f7;font-family:Arial,Helvetica,sans-serif;color:#241b38"><div style="display:none;max-height:0;overflow:hidden">Your 3D print job is now: ${statusLabel}.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden"><tr><td style="background:#241b38;padding:28px 32px;color:#ffffff"><div style="font-size:12px;font-weight:bold;letter-spacing:2px;color:#d8c58a">KNIGHT HACKS</div><div style="font-size:16px;margin-top:10px">${hackathonName} 3D printing</div></td></tr><tr><td style="padding:32px"><h1 style="font-size:30px;line-height:1.15;margin:0 0 24px">${headline}</h1><p style="font-size:16px;line-height:1.6">Hi ${name},<br>Your 3D print job is now: <strong>${statusLabel}</strong>.</p>${note}${readyAt}${button}</td></tr></table><p style="font-size:12px;color:#756b80;line-height:1.5">Knight Hacks</p></td></tr></table></body></html>`;
  return { html, subject, text };
}
