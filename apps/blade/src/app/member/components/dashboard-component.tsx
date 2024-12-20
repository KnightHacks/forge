"use client";

import { useRouter } from "next/navigation";

import { api } from "~/trpc/react";

export default function DashboardComponent() {
  const router = useRouter();

  const { data: member, isLoading } = api.member.getMember.useQuery();

  if (isLoading) {
    return <div>Loading..</div>;
  }

  if (!member) {
    router.push("/");
    return <div>You are not a member! Sign up to be one!</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <h1>Welcome {member.firstName}!</h1>
    </div>
  );
}
