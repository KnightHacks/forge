"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ArrowRightIcon, CheckCircledIcon, cn } from "@forge/ui";
import { Alert, AlertDescription, AlertTitle } from "@forge/ui/alert";
import { buttonVariants } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { toast } from "@forge/ui/toast";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/react";
import { MembershipSuccessSkeleton } from "./membership-success-skeleton";

export function MembershipSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const checkoutSessionId = searchParams.get("session_id") ?? "";

  const { data, isPending, isError } =
    api.duesPayment.orderSuccess.useQuery(checkoutSessionId);

  if (isError) {
    toast.error("Something went wrong, please contact support.");
    router.push(SIGN_IN_PATH);
    return null;
  }

  if (isPending) {
    return <MembershipSuccessSkeleton />;
  }

  if (data.status === "unpaid") {
    toast.error("Checkout session was not complete, please try again.");
    router.push(SIGN_IN_PATH);
    return null;
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircledIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">Payment Successful!</h1>
          <p className="mt-2">
            Thank you for your purchase. We've sent a confirmation email to{" "}
            {data.email ? data.email : "Email not found"}
          </p>
        </div>

        <Alert className="mb-8">
          <AlertTitle className="text-green-600">Order Confirmed</AlertTitle>
          <AlertDescription>
            Your order number is{" "}
            <span className="break-all font-mono font-medium">{data.id}</span>
          </AlertDescription>
        </Alert>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">Knight Hacks Membership</h3>
                  <p className="text-sm text-gray-500">
                    Current Fall & Spring Semester Only
                  </p>
                </div>
                <p className="font-medium">
                  $
                  {data.total
                    ? (data.total / 100).toFixed(2)
                    : "Amount not found"}{" "}
                </p>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between font-medium">
                  <span>Total Paid</span>
                  <span>
                    $
                    {data.total
                      ? (data.total / 100).toFixed(2)
                      : "Amount not found"}{" "}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href={"/dashboard"}
            className={cn(
              buttonVariants({ variant: "primary" }),
              "flex items-center gap-2",
            )}
          >
            Go to Dashboard
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
