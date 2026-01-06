import { auth } from "@forge/auth";
import FormsClient from "../../_components/admin/forms/homepage";
import { SIGN_IN_PATH } from "~/consts";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";

export const metadata = {
  title: "Forms",
};

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const isAdmin = await api.auth.getAdminStatus();
  if (!isAdmin) {
    redirect("/");
  }

  return <FormsClient />;
}
