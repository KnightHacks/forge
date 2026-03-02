"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";

export default function PaymentButton({ member }: { member: InsertMember }) {
  const router = useRouter();
  const [disableButton, setDisableButton] = useState<boolean>(false);

  useEffect(() => {
    const month = new Date().getMonth();

    if (
      (member.school !== "University of Central Florida" &&
        member.school !== "Valencia College" &&
        member.school !== "Seminole State College of Florida" &&
        member.school !== "Rollins College" &&
        member.school !== "DeVry University Orlando" &&
        member.school !== "Johnson University Florida" &&
        member.school !== "Full Sail University") ||
      (month > 3 && month < 7) // disable during summer months
    ) {
      setDisableButton(true);
    }
  }, [member.school]);

  return (
    <Button
      onClick={() => router.push("/member/checkout")}
      disabled={disableButton}
      className="w-full"
    >
      Pay Dues
    </Button>
  );
}
