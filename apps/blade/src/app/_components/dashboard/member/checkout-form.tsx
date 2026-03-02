"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Elements,
    PaymentElement,
    useElements,
    useStripe,
} from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useTheme } from "next-themes";

import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { env } from "~/env";
import { api } from "~/trpc/react";

const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function buildAppearance(isDark: boolean): Appearance {
    return {
        theme: isDark ? "night" : "stripe",
        variables: {
            colorPrimary: isDark ? "#6d28d9" : "#7c3aed",
            colorBackground: isDark ? "#060b1a" : "#ffffff",
            colorText: isDark ? "#f8fafc" : "#060b1a",
            colorDanger: "#ef4444",
            fontFamily: "GeistSans, system-ui, sans-serif",
            borderRadius: "0.5rem",
            colorTextPlaceholder: isDark ? "#94a3b8" : "#9ca3af",
        },
        rules: {
            ".Input": {
                border: `1px solid ${isDark ? "#1e2d40" : "#e2e4eb"}`,
                backgroundColor: isDark ? "#060b1a" : "#ffffff",
                color: isDark ? "#f8fafc" : "#060b1a",
            },
            ".Input:focus": {
                borderColor: isDark ? "#6d28d9" : "#7c3aed",
                boxShadow: `0 0 0 1px ${isDark ? "#6d28d9" : "#7c3aed"}`,
                outline: "none",
            },
            ".Label": {
                color: isDark ? "#94a3b8" : "#6b7280",
                fontSize: "0.875rem",
            },
            ".Tab": {
                border: `1px solid ${isDark ? "#1e2d40" : "#e2e4eb"}`,
                backgroundColor: isDark ? "#060b1a" : "#ffffff",
            },
            ".Tab:hover": {
                backgroundColor: isDark ? "#1e2d40" : "#f3f4f6",
            },
            ".Tab--selected": {
                borderColor: "#7c3aed",
            },
        },
    };
}

function PaymentForm() {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsSubmitting(true);
        setErrorMessage(null);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            redirect: "if_required",
            confirmParams: {
                return_url: `${window.location.origin}/member/success`,
            },
        });

        if (error) {
            setErrorMessage(error.message ?? "An unexpected error occurred.");
            setIsSubmitting(false);
            return;
        }

        if (
            paymentIntent?.status === "succeeded" ||
            paymentIntent?.status === "processing"
        ) {
            router.push(`/member/success?payment_intent=${paymentIntent.id}`);
        } else {
            setErrorMessage("Payment could not be completed. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <PaymentElement />
            {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
            )}
            <div className="flex justify-between">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !stripe}>
                    {isSubmitting ? "Processing..." : "Pay"}
                </Button>
            </div>
        </form>
    );
}

export function CheckoutForm() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [intentError, setIntentError] = useState<string | null>(null);

    const { mutate: createPaymentIntent } =
        api.duesPayment.createPaymentIntent.useMutation({
            onSuccess: (data) => {
                if (data.clientSecret) {
                    setClientSecret(data.clientSecret);
                } else {
                    setIntentError("Could not initialize payment. Please try again.");
                }
            },
            onError: (error) => {
                setIntentError(
                    error.message ?? "Could not initialize payment. Please try again.",
                );
                toast.error("Failed to start checkout.");
            },
        });

    useEffect(() => {
        createPaymentIntent();
    }, [createPaymentIntent]);

    return (
        <div className="mx-auto max-w-4xl overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="grid md:grid-cols-2">
                {/* Left — order summary */}
                <div className="flex flex-col justify-between bg-muted p-8">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">
                            Knight Hacks
                        </p>
                        <h2 className="mt-2 text-4xl font-bold">$25.00</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Club Membership
                        </p>
                    </div>
                    <div className="mt-8 border-t pt-6">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Knight Hacks Membership
                            </span>
                            <span className="font-medium">$25.00</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm font-semibold">
                            <span>Total due today</span>
                            <span>$25.00</span>
                        </div>
                    </div>
                </div>

                {/* Right — payment form */}
                <div className="p-8">
                    {intentError && (
                        <p className="mb-4 text-sm text-destructive">{intentError}</p>
                    )}

                    {!clientSecret && !intentError && (
                        <div className="space-y-3">
                            <div className="h-10 animate-pulse rounded-md bg-muted" />
                            <div className="h-10 animate-pulse rounded-md bg-muted" />
                            <div className="h-10 animate-pulse rounded-md bg-muted" />
                        </div>
                    )}

                    {clientSecret && (
                        <Elements
                            stripe={stripePromise}
                            options={{
                                clientSecret,
                                appearance: buildAppearance(isDark),
                            }}
                        >
                            <PaymentForm />
                        </Elements>
                    )}
                </div>
            </div>
        </div>
    );
}
