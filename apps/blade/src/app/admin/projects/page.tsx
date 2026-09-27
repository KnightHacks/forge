import { redirect } from "next/navigation";

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (firstValue) next.set(key, firstValue);
  }
  next.set("tab", "projects");
  redirect(`/admin/judging?${next.toString()}`);
}
