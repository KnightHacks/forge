import { db } from "@forge/db/client";

import { publicProcedure } from "../trpc";

export const companiesRouter = {
  getCompanies: publicProcedure.query(async () => {
    const companies = db.query.OtherCompanies.findMany({});
    return companies;
  }),
};
