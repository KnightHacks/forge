import { redirect } from "next/navigation";

import { MEMBER_SETTINGS_PATH } from "@forge/validators";

export default function SettingsProfileRedirectPage() {
  redirect(MEMBER_SETTINGS_PATH);
}
