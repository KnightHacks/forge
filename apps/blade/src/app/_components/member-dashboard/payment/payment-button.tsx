"use client";

import { useRouter } from "next/navigation";

import { Button } from "@forge/ui/button";

import { api } from "~/trpc/react";

export default function PaymentButton() {
  const { mutateAsync: createCheckoutUrl } =
    api.duesPayment.createCheckout.useMutation();
  const router = useRouter();

  const handleCheckout = async () => {
    const { checkoutUrl } = await createCheckoutUrl();
    if (checkoutUrl) {
      router.push(checkoutUrl);
    }
  };
  return (
    <div className="relative top-3">
      <Button onClick={handleCheckout}>Pay Dues</Button>
    </div>
  );
}
