import type { TeamRoster } from "./teams-config";
import { getBladeTrpcClient } from "../_lib/blade-trpc";

export async function loadClubTeamRoster(
  bladeUrl: string,
  signal: AbortSignal,
): Promise<TeamRoster> {
  return await getBladeTrpcClient(bladeUrl).guild.getPublicClubTeamRoster.query(
    undefined,
    { signal },
  );
}
