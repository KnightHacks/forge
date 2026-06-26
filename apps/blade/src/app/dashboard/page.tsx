import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

export default function DashboardRedirectPage() {
  redirect(MEMBER_DASHBOARD_PATH);
}
