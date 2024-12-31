"use client";

import { useRouter } from "next/navigation";

import { Button } from "@forge/ui/button";

import { api } from "~/trpc/react";

export default function PaymentButton() {
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
    <div className="flex flex-col items-center justify-center gap-4">
      <Button onClick={handleCheckout}>Become a Member</Button>
    </div>
  );
}
