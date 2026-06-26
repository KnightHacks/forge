import { redirect } from "next/navigation";

import { MEMBER_SETTINGS_PATH } from "@forge/validators";

export default function SettingsRedirectPage() {
  redirect(MEMBER_SETTINGS_PATH);
}
