import { HackerJudging } from "../../_components/hacker-judging";

export default async function JudgingPage({
  searchParams,
}: {
  searchParams: Promise<{ claim?: string }>;
}) {
  const { claim } = await searchParams;
  return <HackerJudging token={claim ?? null} />;
}
