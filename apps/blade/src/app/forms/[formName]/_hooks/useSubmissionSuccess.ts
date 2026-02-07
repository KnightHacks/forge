import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UseSubmissionSuccessOptions {
  redirectTo?: string;
  redirectDelayMs?: number;
  checkmarkDelayMs?: number;
  textDelayMs?: number;
}

export function useSubmissionSuccess(
  isSubmitted: boolean,
  {
    redirectTo = "/",
    redirectDelayMs = 5000,
    checkmarkDelayMs = 100,
    textDelayMs = 400,
  }: UseSubmissionSuccessOptions = {},
) {
  const router = useRouter();

  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showText, setShowText] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(
    redirectDelayMs / 1000,
  );

  useEffect(() => {
    if (!isSubmitted) return;

    const checkTimer = setTimeout(
      () => setShowCheckmark(true),
      checkmarkDelayMs,
    );

    const textTimer = setTimeout(() => setShowText(true), textDelayMs);

    const countdownInterval = setInterval(() => {
      setRedirectCountdown((prev) => prev - 1);
    }, 1000);

    const redirectTimer = setTimeout(() => {
      router.push(redirectTo);
    }, redirectDelayMs);

    return () => {
      clearTimeout(checkTimer);
      clearTimeout(textTimer);
      clearInterval(countdownInterval);
      clearTimeout(redirectTimer);
    };
  }, [
    isSubmitted,
    router,
    redirectTo,
    redirectDelayMs,
    checkmarkDelayMs,
    textDelayMs,
  ]);

  return {
    showCheckmark,
    showText,
    redirectCountdown,
  };
}
