"use client";

import type { Appearance } from "@stripe/stripe-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Skeleton } from "@forge/ui/skeleton";
import { useTheme } from "@forge/ui/theme";
import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { CurrentDuesStatus } from "~/app/_components/member/member-dashboard";
import { dashboardNestedSurfaceClass } from "~/app/_components/member/member-dashboard";
import { MemberRouteTransitionLink } from "~/app/_components/member/member-route-transition-link";
import { env } from "~/env";
import { api } from "~/trpc/react";

type DuesPaymentIntent = RouterOutputs["dues"]["createPaymentIntent"];

const stripePromise =
  env.NEXT_PUBLIC_BLADE_E2E_AUTH === "true"
    ? null
    : loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const duesPaymentCardClass =
  "border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/25";

function buildStripeAppearance(isDark: boolean): Appearance {
  return {
    rules: {
      ".Input": {
        backgroundColor: isDark ? "#030712" : "#ffffff",
        border: `1px solid ${isDark ? "#26334A" : "#E5E7EB"}`,
        boxShadow: "none",
        color: isDark ? "#F8FAFC" : "#030712",
      },
      ".Input:focus": {
        borderColor: "#6D28D9",
        boxShadow: "0 0 0 1px #6D28D9",
      },
      ".Label": {
        color: isDark ? "#94A3B8" : "#6B7280",
        fontSize: "13px",
      },
      ".Tab": {
        backgroundColor: isDark ? "#030712" : "#ffffff",
        border: `1px solid ${isDark ? "#26334A" : "#E5E7EB"}`,
        boxShadow: "none",
        padding: "8px 10px",
      },
      ".Tab--selected": {
        borderColor: "#6D28D9",
      },
      ".TabLabel": {
        color: isDark ? "#F8FAFC" : "#030712",
        fontSize: "13px",
        fontWeight: "500",
      },
    },
    theme: isDark ? "night" : "stripe",
    variables: {
      borderRadius: "8px",
      colorBackground: isDark ? "#0B1020" : "#ffffff",
      colorDanger: "#EF4444",
      colorPrimary: "#6D28D9",
      colorText: isDark ? "#F8FAFC" : "#030712",
      colorTextPlaceholder: isDark ? "#94A3B8" : "#6B7280",
      fontFamily: "GeistSans, system-ui, sans-serif",
    },
  };
}

function LateYearWarningDialog({
  open,
  onContinue,
  onReturnHome,
}: {
  onContinue: () => void;
  onReturnHome: () => void;
  open: boolean;
}) {
  return (
    <Dialog open={open}>
      <DialogContent className="mx-2 max-w-md rounded-lg p-5">
        <DialogHeader>
          <DialogTitle>The school year is almost over</DialogTitle>
          <DialogDescription>
            The new school year is almost here, which means you will need to pay
            dues again in the Fall Semester. You can still continue paying for
            the current academic school year.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button type="button" variant="outline" onClick={onReturnHome}>
            Return home
          </Button>
          <Button type="button" onClick={onContinue}>
            Continue to payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SuccessDialog({
  academicYear,
  countdownSeconds,
  onReturnToDashboard,
  open,
}: {
  academicYear: string;
  countdownSeconds: number;
  onReturnToDashboard: () => void;
  open: boolean;
}) {
  return (
    <Dialog open={open}>
      <DialogContent className="mx-2 max-w-md rounded-lg p-5">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-[hsl(var(--chart-2)/0.35)] bg-[hsl(var(--chart-2)/0.14)] text-[hsl(var(--chart-2))]">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>Dues paid</DialogTitle>
          <DialogDescription>
            Your dues are paid for the {academicYear}. Returning to your
            dashboard in {countdownSeconds}{" "}
            {countdownSeconds === 1 ? "second" : "seconds"}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={onReturnToDashboard}>
            Return to dashboard now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentSummary({ duesStatus }: { duesStatus: CurrentDuesStatus }) {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className={cn(dashboardNestedSurfaceClass, "p-4")}>
        <p className="text-sm text-muted-foreground">Total due today</p>
        <p className="mt-2 text-3xl font-semibold tracking-normal">
          {duesStatus.amountDueLabel}
        </p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {duesStatus.payableAcademicYear.label}
        </p>
      </div>
      <div className={cn(dashboardNestedSurfaceClass, "space-y-2 p-4")}>
        <p className="text-sm font-medium">Non-refundable membership dues</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Dues support Knight Hacks membership programming and access for the
          selected academic school year.
        </p>
      </div>
    </div>
  );
}

function PaymentSkeleton() {
  return (
    <div className="space-y-4" aria-label="Starting secure payment">
      <div className="flex items-center gap-3 rounded-md border border-white/10 bg-background/60 p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Starting secure payment
      </div>
      <Skeleton className="h-14 w-full rounded-md" />
      <Skeleton className="h-32 w-full rounded-md" />
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
  );
}

function PaymentSetupError({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div className="space-y-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      <p>{message || "Could not start checkout."}</p>
      <Button
        type="button"
        variant="outline"
        className="gap-2 border-destructive/40 bg-background/40 text-foreground hover:bg-background/70"
        disabled={retrying}
        onClick={onRetry}
      >
        {retrying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Retry checkout
      </Button>
    </div>
  );
}

function StripePaymentForm({
  onPaid,
}: {
  onPaid: (academicYear: string) => void;
}) {
  const elements = useElements();
  const stripe = useStripe();
  const confirmPayment = api.dues.confirmPayment.useMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setErrorMessage(null);
    setProcessingMessage(null);
    setIsSubmitting(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      confirmParams: {
        return_url: `${window.location.origin}/member/dues`,
      },
      elements,
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "Payment could not be completed.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await confirmPayment.mutateAsync({
        paymentIntentId: paymentIntent.id,
      });

      if (result.state === "processing") {
        setProcessingMessage(
          "Your payment is still processing. We will update your dues status once Stripe confirms it.",
        );
        return;
      }

      onPaid(result.paymentAcademicYear.label);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Payment could not be confirmed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: {
            defaultCollapsed: false,
            radios: false,
            spacedAccordionItems: false,
            type: "accordion",
          },
        }}
      />
      {processingMessage && (
        <p className="rounded-md border border-white/10 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
          {processingMessage}
        </p>
      )}
      {errorMessage && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full gap-2"
        disabled={!stripe || isSubmitting || confirmPayment.isPending}
      >
        {(isSubmitting || confirmPayment.isPending) && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {isSubmitting || confirmPayment.isPending ? "Processing" : "Pay dues"}
      </Button>
    </form>
  );
}

function DuesPaymentForm({
  duesStatus,
  initialPaymentError,
  initialPaymentIntent,
  onPaid,
}: {
  duesStatus: CurrentDuesStatus;
  initialPaymentError?: string | null;
  initialPaymentIntent?: DuesPaymentIntent | null;
  onPaid: (academicYear: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  const createPaymentIntent = api.dues.createPaymentIntent.useMutation();
  const hasRequestedPaymentIntent = useRef(false);
  const isE2EPaymentMode = env.NEXT_PUBLIC_BLADE_E2E_AUTH === "true";
  const isDark = resolvedTheme !== "light";
  const appearance = useMemo(() => buildStripeAppearance(isDark), [isDark]);

  useEffect(() => {
    if (
      isE2EPaymentMode ||
      initialPaymentIntent ||
      initialPaymentError ||
      hasRequestedPaymentIntent.current
    ) {
      return;
    }

    hasRequestedPaymentIntent.current = true;
    createPaymentIntent.mutate(undefined);
  }, [
    createPaymentIntent,
    initialPaymentError,
    initialPaymentIntent,
    isE2EPaymentMode,
  ]);

  if (isE2EPaymentMode) {
    return <E2EDuesPaymentButton duesStatus={duesStatus} onPaid={onPaid} />;
  }

  const paymentIntent = createPaymentIntent.data ?? initialPaymentIntent;
  const setupError =
    createPaymentIntent.error?.message ?? initialPaymentError ?? null;

  if (!paymentIntent && setupError) {
    return (
      <PaymentSetupError
        message={setupError}
        retrying={createPaymentIntent.isPending}
        onRetry={() => createPaymentIntent.mutate(undefined)}
      />
    );
  }

  if (!paymentIntent?.clientSecret) {
    return <PaymentSkeleton />;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        appearance,
        clientSecret: paymentIntent.clientSecret,
      }}
    >
      <StripePaymentForm onPaid={onPaid} />
    </Elements>
  );
}

function E2EDuesPaymentButton({
  duesStatus,
  onPaid,
}: {
  duesStatus: CurrentDuesStatus;
  onPaid: (academicYear: string) => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completePayment = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const response = await fetch("/api/e2e/dues-payment", {
      method: "POST",
    });

    if (!response.ok) {
      setErrorMessage("Test payment could not be completed.");
      setIsSubmitting(false);
      return;
    }

    onPaid(duesStatus.payableAcademicYear.label);
  };

  return (
    <div className="space-y-4">
      <div className={cn(dashboardNestedSurfaceClass, "p-4")}>
        <p className="text-sm font-medium">E2E payment mode</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          This replaces Stripe only while Blade E2E auth is enabled.
        </p>
      </div>
      {errorMessage && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
      <Button
        type="button"
        size="lg"
        className="h-11 w-full gap-2"
        disabled={isSubmitting}
        onClick={completePayment}
      >
        {isSubmitting && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {isSubmitting ? "Processing" : "Complete test payment"}
      </Button>
    </div>
  );
}

export function MemberDuesPayment({
  duesStatus,
  initialPaymentError = null,
  initialPaymentIntent = null,
}: {
  duesStatus: CurrentDuesStatus;
  initialPaymentError?: string | null;
  initialPaymentIntent?: DuesPaymentIntent | null;
}) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const [lateWarningOpen, setLateWarningOpen] = useState(
    duesStatus.lateYearWarning,
  );
  const [successAcademicYear, setSuccessAcademicYear] = useState<string | null>(
    null,
  );
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const returnToDashboard = useCallback(() => {
    router.replace(MEMBER_DASHBOARD_PATH);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!successAcademicYear) return;

    const countdownInterval = window.setInterval(() => {
      setRedirectCountdown((current) => Math.max(1, current - 1));
    }, 1_000);
    const redirectTimeout = window.setTimeout(returnToDashboard, 5_000);

    return () => {
      window.clearInterval(countdownInterval);
      window.clearTimeout(redirectTimeout);
    };
  }, [returnToDashboard, successAcademicYear]);

  const handlePaid = (academicYear: string) => {
    setRedirectCountdown(5);
    setSuccessAcademicYear(academicYear);
    void apiUtils.dues.getStatus.invalidate();
  };

  return (
    <main className="container py-7 md:py-10">
      <div className="mx-auto max-w-5xl space-y-5 md:space-y-7">
        <Button asChild variant="ghost" className="w-fit gap-2 px-2">
          <MemberRouteTransitionLink href={MEMBER_DASHBOARD_PATH}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </MemberRouteTransitionLink>
        </Button>

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">
            Pay member dues
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
            Complete dues for the {duesStatus.payableAcademicYear.label}.
          </p>
        </div>

        <section>
          <Card
            className={cn(
              duesPaymentCardClass,
              "mx-auto min-h-[clamp(36rem,calc(100svh-10rem),46rem)] w-full gap-0 overflow-visible",
            )}
          >
            <CardHeader className="border-b border-border/70 px-5 py-5 md:px-6">
              <CardTitle className="text-lg leading-none tracking-normal">
                Payment method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-4 md:p-6 lg:p-8">
              <PaymentSummary duesStatus={duesStatus} />
              <DuesPaymentForm
                duesStatus={duesStatus}
                initialPaymentError={initialPaymentError}
                initialPaymentIntent={initialPaymentIntent}
                onPaid={handlePaid}
              />
            </CardContent>
          </Card>
        </section>
      </div>

      <LateYearWarningDialog
        open={lateWarningOpen && !successAcademicYear}
        onContinue={() => setLateWarningOpen(false)}
        onReturnHome={() => router.push(MEMBER_DASHBOARD_PATH)}
      />
      <SuccessDialog
        open={Boolean(successAcademicYear)}
        academicYear={
          successAcademicYear ?? duesStatus.payableAcademicYear.label
        }
        countdownSeconds={redirectCountdown}
        onReturnToDashboard={returnToDashboard}
      />
    </main>
  );
}
