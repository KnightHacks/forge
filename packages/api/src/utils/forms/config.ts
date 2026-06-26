import { MEMBER_SIGNUP_CALLBACK_PROC } from "@forge/validators";

import type { CodeOwnedFormConfig, FormResponseCallbackMap } from "./manager";
import {
  createMemberFromFormResponse,
  memberSignupFormConfig,
} from "../member/onboarding";

export const codeOwnedFormConfigs = [
  memberSignupFormConfig,
] satisfies readonly CodeOwnedFormConfig[];

export const formResponseCallbacks = {
  [MEMBER_SIGNUP_CALLBACK_PROC]: createMemberFromFormResponse,
} satisfies FormResponseCallbackMap;
