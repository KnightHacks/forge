import { Suspense } from "react";

import { MembershipSuccess } from "~/app/_components/dashboard/member/membership-success-page";
import { MembershipSuccessSkeleton } from "~/app/_components/dashboard/member/membership-success-skeleton";

export default function CheckoutSuccessPage() {
  return (
    <div>
      <Suspense fallback={<MembershipSuccessSkeleton />}>
        <MembershipSuccess />
      </Suspense>
    </div>
  );
}
