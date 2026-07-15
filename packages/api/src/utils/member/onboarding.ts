import {
  MEMBER_SIGNUP_CALLBACK_PROC,
  MEMBER_SIGNUP_COMPLETION_REDIRECT_URL,
  MEMBER_SIGNUP_CONNECTION_ID,
  MEMBER_SIGNUP_FORM_ID,
  MEMBER_SIGNUP_FORM_SLUG,
  memberSchema,
  memberSignupCallbackConnections,
  memberSignupFormData,
  memberSignupFormJsonSchema,
} from "@forge/validators";

import type {
  CodeOwnedFormConfig,
  FormResponseCallback,
} from "../forms/manager";
import { createMemberProfile } from "./profile";

export const memberSignupFormConfig = {
  id: MEMBER_SIGNUP_FORM_ID,
  slugName: MEMBER_SIGNUP_FORM_SLUG,
  name: memberSignupFormData.name,
  completionRedirectUrl: MEMBER_SIGNUP_COMPLETION_REDIRECT_URL,
  duesOnly: false,
  allowResubmission: false,
  allowEdit: false,
  formData: memberSignupFormData,
  formValidatorJson: memberSignupFormJsonSchema,
  section: "Membership",
  sectionId: "53fc75b1-7308-4af0-84e8-b79292b5eb33",
  isClosed: false,
  connection: {
    id: MEMBER_SIGNUP_CONNECTION_ID,
    proc: MEMBER_SIGNUP_CALLBACK_PROC,
    connections: memberSignupCallbackConnections,
  },
} satisfies CodeOwnedFormConfig;

export const createMemberFromFormResponse: FormResponseCallback = async ({
  data,
  database,
  session,
}) => {
  const input = memberSchema.parse(data);

  return await createMemberProfile({
    database,
    input,
    session,
  });
};
