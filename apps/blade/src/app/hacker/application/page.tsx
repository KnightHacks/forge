import { redirect } from "next/navigation";

// Uncomment if you're a dev and need to use the hacker application

// import { auth } from "@forge/auth";
// import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";

// import { api } from "~/trpc/server";
// import { HackerFormPage } from "./_components/hacker-application-form";
// import { api } from "~/trpc/server";
// import { HackerFormPage } from "./_components/hacker-application-form";

// export default async function HackerApplicationPage() {
  export default function HackerApplicationPage() {
    redirect(SIGN_IN_PATH);
  // const session = await auth();

  // if (session == null) {
// export default async function HackerApplicationPage() {
export default function HackerApplicationPage() {
    redirect(SIGN_IN_PATH);
  // const session = await auth();

  // if (session == null) {
  //   redirect(SIGN_IN_PATH);
  // }

  // const isHacker = await api.hacker.getHacker();

  // if (isHacker) {
  //   return redirect(SIGN_IN_PATH);
  // }

  // return (
  //   <main className="px-8 py-4">
  //     <HackerFormPage />
  //   </main>
  // );
}
