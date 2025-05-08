import { api } from "~/trpc/server";

export default function EmailPage() {
  api.email.sendEmail({
    from: "donotreply@knighthacks.org",
    to: "lwbobda@gmail.com",
    subject: "test",
    body: "test",
  });
  return (
    <>
      <button>click</button>
    </>
  );
}
