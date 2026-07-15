import { z } from "zod";

export * from "./hackathons";
export * from "./forms";
export * from "./forms-platform";
export * from "./member";
export * from "./dues";
export * from "./admin-member";
export * from "./role-management";
export * from "./event-management";

export const unused = z.string().describe(
  `This lib is currently not used as we use drizzle-zod for simple schemas
   But as your application grows and you need other validators to share
   with back and frontend, you can put them in here
  `,
);
