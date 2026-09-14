function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );
}

/** Shared Knight Hacks template for project claims and invitations. */
export function projectClaimEmail(input: {
  project: string;
  name: string;
  url: string;
  invited: boolean;
}) {
  const project = escapeHtml(input.project);
  const name = escapeHtml(input.name);
  const url = escapeHtml(input.url);
  const heading = input.invited
    ? "Your team is waiting."
    : "Make your project yours.";
  const subject = `Knight Hacks: ${input.invited ? "Join" : "Claim"} ${input.project}`;
  const intro = input.invited
    ? `Your teammates invited you to join ${project}.`
    : `Connect your project for a Knight Hacks hackathon to your hacker profile.`;
  const text = `Hi ${input.name},\n\n${input.invited ? "Your teammates invited you to join" : "Claim your place on"} ${input.project} for a Knight Hacks hackathon.\n\nOpen ${input.url}\n\nSign in to your hacker account and select yourself. You must be checked in to this event. This link can be used once.\n\nYour judging times will appear after organizers publish the schedule.\n\nKnight Hacks`;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8"></head><body style="margin:0;background:#f2f0f7;font-family:Arial,Helvetica,sans-serif;color:#241b38"><div style="display:none;max-height:0;overflow:hidden">Connect your team, then get your project's judging itinerary.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden"><tr><td style="background:#241b38;padding:28px 32px;color:#ffffff"><div style="font-size:12px;font-weight:bold;letter-spacing:2px;color:#d8c58a">KNIGHT HACKS</div><div style="font-size:16px;margin-top:10px">Hackathon project claim</div></td></tr><tr><td style="padding:32px"><h1 style="font-size:30px;line-height:1.15;margin:0 0 24px">${heading}</h1><p style="font-size:16px;line-height:1.6">Hi ${name},<br>${intro}</p><div style="background:#f4f1fa;border-left:4px solid #7143b8;padding:18px 20px;margin:24px 0"><div style="font-size:11px;color:#62556e;letter-spacing:1px">YOUR PROJECT</div><div style="font-size:22px;font-weight:bold;margin-top:8px;overflow-wrap:anywhere">${project}</div></div><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#6535a4"><a href="${url}" style="display:inline-block;padding:16px 24px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none">${input.invited ? "Join your team" : "Claim your project"} &rarr;</a></td></tr></table><p style="font-size:14px;line-height:1.6;color:#62556e;margin-top:24px">Sign in to your hacker account and select yourself. You must be checked in to the hackathon. This link can be used once.</p><hr style="border:0;border-top:1px solid #e8e3ee;margin:28px 0"><h2 style="font-size:17px;margin:0 0 8px">Your next stop: judging</h2><p style="font-size:14px;line-height:1.6;color:#62556e;margin:0">Once organizers publish the schedule, your portal will show where to go, when to arrive, and which challenges to present for.</p></td></tr></table><p style="font-size:12px;color:#756b80;line-height:1.5">Knight Hacks<br>Keep this link within your team.</p></td></tr></table></body></html>`;
  return { html, subject, text };
}
