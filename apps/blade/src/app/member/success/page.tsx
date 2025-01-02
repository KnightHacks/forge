"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ArrowRightIcon, CheckCircledIcon, cn } from "@forge/ui";
import { Alert, AlertDescription, AlertTitle } from "@forge/ui/alert";
import { buttonVariants } from "@forge/ui/button";
import {
  Card,
  CardContent,
  //CardDescription,
  //CardFooter,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import { Skeleton } from "@forge/ui/skeleton";
import { toast } from "@forge/ui/toast";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/react";

export default function MembershipSuccess() {
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
            href={SIGN_IN_PATH}
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

function MembershipSuccessSkeleton() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header Section Skeleton */}
        <div className="mb-8 text-center">
          <div className="mx-auto">
            <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-full" />
          </div>
          <Skeleton className="mx-auto mb-2 h-9 w-64" />
          <Skeleton className="mx-auto h-5 w-96" />
        </div>

        {/* Order Alert Skeleton */}
        <div className="mb-8 rounded-lg border p-4">
          <Skeleton className="mb-2 h-6 w-36" />
          <Skeleton className="h-5 w-72" />
        </div>

        {/* Order Summary Card Skeleton */}
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-7 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons Skeleton */}
        <div className="flex flex-row justify-center gap-4">
          <Skeleton className="h-10 w-full sm:w-36" />
        </div>
      </div>
    </div>
  );
}
