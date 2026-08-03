import { redirect } from "next/navigation";

/**
 * The per-hackathon roster moved to `/admin/hackers`, where the hackathon is
 * chosen from a picker rather than baked into the path.
 *
 * Kept as a redirect rather than deleted: the hackathon detail screen links
 * here, and so will any address an officer already bookmarked or shared. The
 * hackathon carries across as a query parameter, so the destination opens on
 * the roster they asked for.
 */
export default async function LegacyHackerRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/hackers?hackathon=${id}`);
}
