"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  useOptimistic,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@forge/ui";

type Router = ReturnType<typeof useRouter>;

const NavigationContext = createContext<{
  isPending: boolean;
  pendingHref: string | null;
  router: Router;
} | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useOptimistic<string | null>(null);
  const navigationRouter = useMemo<Router>(() => {
    const navigate = (
      method: "push" | "replace",
      href: string,
      options?: Parameters<Router["push"]>[1],
    ) => {
      const destination = new URL(href, window.location.href);
      // Anchor jumps and repeated clicks on the current URL need no loading UI.
      if (
        destination.origin !== window.location.origin ||
        (destination.pathname === window.location.pathname &&
          destination.search === window.location.search)
      ) {
        router[method](href, options);
        return;
      }
      startTransition(() => {
        setPendingHref(href);
        router[method](href, options);
      });
    };

    return {
      ...router,
      push: (href, options) => navigate("push", href, options),
      replace: (href, options) => navigate("replace", href, options),
      refresh: () => startTransition(() => router.refresh()),
    };
  }, [router, setPendingHref]);
  const value = useMemo(
    () => ({ isPending, pendingHref, router: navigationRouter }),
    [isPending, pendingHref, navigationRouter],
  );

  return (
    <NavigationContext value={value}>
      <div role="status" aria-live="polite" className="sr-only">
        {isPending ? "Loading page…" : ""}
      </div>
      {isPending ? (
        <div
          role="progressbar"
          aria-label="Loading page"
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/20"
        >
          <div className="blade-navigation-progress h-full w-1/3 rounded-full bg-primary" />
        </div>
      ) : null}
      {children}
    </NavigationContext>
  );
}

/** Keeps feedback mounted even when the initiating dialog or menu closes. */
export function useNavigationRouter() {
  const router = useRouter();
  return useContext(NavigationContext)?.router ?? router;
}

export function useNavigationPathname() {
  const pathname = usePathname();
  const navigation = useContext(NavigationContext);
  return navigation?.pendingHref
    ? new URL(navigation.pendingHref, window.location.href).pathname
    : pathname;
}

export function RouteTransitionSurface({ children }: { children: ReactNode }) {
  const navigation = useContext(NavigationContext);
  return <div aria-busy={navigation?.isPending ?? false}>{children}</div>;
}

/** GET searches keep their native no-JavaScript fallback and avoid a full reload. */
export function RouteSearchForm({
  children,
  className,
  role,
  onSubmit,
}: Pick<
  ComponentPropsWithoutRef<"form">,
  "children" | "className" | "role" | "onSubmit"
>) {
  const navigation = useContext(NavigationContext);
  return (
    <form
      className={className}
      method="get"
      role={role}
      onSubmit={(event) => {
        onSubmit?.(event);
        if (!navigation || event.defaultPrevented) return;
        event.preventDefault();
        const params = new URLSearchParams();
        for (const [key, value] of new FormData(event.currentTarget)) {
          if (typeof value === "string") params.append(key, value);
        }
        navigation.router.push(
          `${window.location.pathname}?${params.toString()}`,
        );
      }}
    >
      {children}
    </form>
  );
}

export const RouteTransitionLink = forwardRef<
  HTMLAnchorElement,
  Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
    beforeNavigate?: () => boolean;
    href: string;
  }
>(
  (
    { beforeNavigate, className, href, onNavigate, replace, scroll, ...props },
    ref,
  ) => {
    const navigation = useContext(NavigationContext);
    const pending = navigation?.pendingHref === href;

    return (
      <Link
        {...props}
        ref={ref}
        href={href}
        replace={replace}
        scroll={scroll}
        data-pending={pending || undefined}
        className={cn(
          "group transition-opacity motion-reduce:transition-none",
          pending && "opacity-70",
          className,
        )}
        onNavigate={(event) => {
          // Next handles modifiers, downloads, external links and cancelled clicks
          // before onNavigate. Preserve both existing navigation guards as well.
          const intent = { cancelled: false };
          onNavigate?.({
            preventDefault: () => {
              intent.cancelled = true;
              event.preventDefault();
            },
          });
          if (intent.cancelled) return;
          if (beforeNavigate && !beforeNavigate()) {
            event.preventDefault();
            return;
          }
          if (!navigation) return;
          event.preventDefault();
          navigation.router[replace ? "replace" : "push"](href, { scroll });
        }}
      />
    );
  },
);
RouteTransitionLink.displayName = "RouteTransitionLink";
