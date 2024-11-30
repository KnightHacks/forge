"use client";

import { useRouter } from "next/navigation";

import { Button } from "@forge/ui/button";

import { api } from "~/trpc/react";

export default function Payment() {
  const { mutateAsync: createCheckoutUrl } =
    api.payment.createCheckout.useMutation();
  const router = useRouter();

  const handleCheckout = async () => {
    const { checkoutUrl } = await createCheckoutUrl();
    if (checkoutUrl) {
      router.push(checkoutUrl);
    }
  };
  return (
    <main className="container h-screen py-16">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Become Member
        </h1>
        <Button onClick={handleCheckout}>Checkout</Button>
      </div>
    </main>
  );
}
