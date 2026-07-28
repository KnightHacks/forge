import type { MemberSettingsFieldDefinition } from "@forge/validators";
import { memberSettingsFields } from "@forge/validators";

export type MemberSettingsSection = MemberSettingsFieldDefinition["section"];

/** Render order of the settings cards, and of the skeleton that stands in for them. */
export const memberSettingsSectionOrder: MemberSettingsSection[] = [
  "Personal",
  "Academics",
  "Guild",
];

/**
 * Groups the shared field catalog into the rendered sections. A field whose
 * section is not in `memberSettingsSectionOrder` is not rendered at all, so the
 * accompanying test asserts every field lands in exactly one group.
 */
export function memberSettingsFieldsBySection() {
  return memberSettingsSectionOrder.map((section) => ({
    section,
    fields: memberSettingsFields.filter((field) => field.section === section),
  }));
}
