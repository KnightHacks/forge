import { Suspense } from "react";

import { MembershipSuccess } from "./_components/membership-success-page";
import { MembershipSuccessSkeleton } from "./_components/membership-success-skeleton";

export default function CheckoutSuccessPage() {
  return (
    <div>
      <Suspense fallback={<MembershipSuccessSkeleton />}>
        <MembershipSuccess />
      </Suspense>
    </div>
  );
}
