import { auth } from "~/auth/server";
import { getKhixHackathon } from "~/lib/khix-hackathon";
import { KhixDashboardNotFound } from "../_components/khix-dashboard";
import { KhixPublicNotFound } from "../../_components/not-found";

export default async function DashboardNotFound() {
  const [session, khix] = await Promise.all([auth(), getKhixHackathon()]);

  if (!session || !khix) return <KhixPublicNotFound />;

  return (
    <KhixDashboardNotFound
      sessionUser={{
        discordUserId: session.user.discordUserId,
        email: session.user.email,
        image: session.user.image,
        name: session.user.name,
      }}
    />
  );
}
