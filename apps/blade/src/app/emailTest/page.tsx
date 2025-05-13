import { pretty, render } from "@react-email/render";

import { AcceptanceEmail } from "~/../../email-templates/emails/acceptance-email";
import { api } from "~/trpc/server";

export default async function EmailPage() {
  const html = await pretty(
    await render(<AcceptanceEmail name={"Katherina"} />),
  );
  await api.email.sendEmail({
    from: "donotreply@knighthacks.org",
    to: "lwbobda@gmail.com",
    subject: "test",
    body: html,
  });

  return (
    <>
      <button>click</button>
    </>
  );
}
