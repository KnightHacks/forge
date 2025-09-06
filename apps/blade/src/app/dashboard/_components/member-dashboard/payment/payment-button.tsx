"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";

import { api } from "~/trpc/react";

export default function PaymentButton({ member }: { member: InsertMember }) {
  const { mutateAsync: createCheckoutUrl } =
    api.duesPayment.createCheckout.useMutation();
  const router = useRouter();

  const [disableButton, setDisableButton] = useState<boolean>(false);

  useEffect(() => {
    const month = new Date().getMonth();

    if (
      (member.school !== "University of Central Florida" &&
        member.school !== "Valencia College") ||
      (month > 3 && month < 7) // disable during summer months
    ) {
      setDisableButton(true);
    }
  }, [member.school]);

  const handleCheckout = async () => {
    const { checkoutUrl } = await createCheckoutUrl();
    if (checkoutUrl) {
      router.push(checkoutUrl);
    }
  };
  return (
    <Button onClick={handleCheckout} disabled={disableButton} className="w-full">
      Pay Dues
    </Button>
  );
}
