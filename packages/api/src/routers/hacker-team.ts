import type { TRPCRouterRecord } from "@trpc/server";

import { desc } from "@forge/db";
import { db } from "@forge/db/client";
import { Hackathon } from "@forge/db/schemas/knight-hacks";
import {
  hackerTeamAdminActionSchema,
  hackerTeamAdminSearchSchema,
} from "@forge/validators";

import { permProcedure } from "../trpc";
import {
  requireTeamsEdit,
  requireTeamsRead,
} from "../utils/hacker-teams/access";
import {
  changeHackerTeam,
  searchHackerTeams,
} from "../utils/hacker-teams/teams";

export const hackerTeamRouter = {
  hackathons: permProcedure.query(({ ctx }) => {
    requireTeamsRead(ctx);
    return db
      .select({ id: Hackathon.id, name: Hackathon.displayName })
      .from(Hackathon)
      .orderBy(desc(Hackathon.startDate));
  }),
  list: permProcedure
    .input(hackerTeamAdminSearchSchema)
    .query(({ ctx, input }) => {
      requireTeamsRead(ctx);
      return searchHackerTeams(
        input.hackathonId,
        input.query,
        input.page,
        undefined,
        true,
      );
    }),
  change: permProcedure
    .input(hackerTeamAdminActionSchema)
    .mutation(({ ctx, input }) => {
      requireTeamsEdit(ctx);
      return changeHackerTeam(
        ctx.session.user.id,
        input.hackathonId,
        input.change,
        true,
      );
    }),
} satisfies TRPCRouterRecord;
