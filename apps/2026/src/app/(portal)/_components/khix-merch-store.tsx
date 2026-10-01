"use client";

import Image from "next/image";
import { MapPin, Package, RefreshCw } from "lucide-react";

import {
  useHackerDashboard,
  useHackerPointStore,
  useHackerSession,
} from "@forge/hacker-sdk/react";
import { Button } from "@forge/ui/button";

import { KhixDashboardShell } from "./khix-dashboard";
import styles from "./khix-dashboard.module.css";

export function KhixMerchStore() {
  const session = useHackerSession();
  const dashboard = useHackerDashboard();
  const store = useHackerPointStore();
  const checkedIn = dashboard.data?.application?.status === "checkedin";
  return (
    <KhixDashboardShell
      activeItem="merch"
      sessionUser={{ name: session.data?.displayName }}
    >
      <section
        className={styles.journeyExperience}
        aria-labelledby="merch-title"
      >
        <header className={styles.journeyHero}>
          <p className={styles.journeyEyebrow}>Knight Hacks IX</p>
          <h1 id="merch-title" className={styles.journeyTitle}>
            Merch Store
          </h1>
          <p className={styles.journeyIntro}>
            Pick your merch, then visit an organizer to spend your points.
          </p>
        </header>
        {dashboard.isPending ? (
          <p role="status">Loading store…</p>
        ) : dashboard.isError ? (
          <div role="alert">
            <p>Could not check your status.</p>
            <Button onClick={() => void dashboard.refetch()}>Try again</Button>
          </div>
        ) : !checkedIn ? (
          <div className={styles.journeyPanel}>
            <h2 className="text-xl">Unlocks at check-in</h2>
            <p className={styles.journeyIntro}>
              Check in at the hackathon to browse merch and see what you can
              afford.
            </p>
          </div>
        ) : store.isPending ? (
          <p role="status">Loading catalog…</p>
        ) : store.isError ? (
          <div role="alert" className={styles.journeyPanel}>
            <p>The store could not be loaded.</p>
            <Button className="mt-3" onClick={() => void store.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <dl className={styles.journeyStats}>
              <div className={styles.journeyStat}>
                <dt>Spending power</dt>
                <dd>{store.data.available} pts</dd>
              </div>
              <div className={styles.journeyStat}>
                <dt>Total earned</dt>
                <dd>{store.data.earned} pts</dd>
              </div>
              <div className={styles.journeyStat}>
                <dt>Spent on merch</dt>
                <dd>{store.data.spent} pts</dd>
              </div>
            </dl>
            <div className={styles.journeyPanel}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <p className="text-lg font-semibold">
                    {store.data.open ? "Open for pickup" : "Store closed"}
                  </p>
                  <p className={styles.journeyIntro}>
                    {store.data.open
                      ? "Visit the merch store to make a purchase."
                      : "Hold off on coming over. Check back here for when the store opens."}
                  </p>
                  {store.data.location && (
                    <p className="flex items-start gap-2 text-sm">
                      <MapPin aria-hidden="true" className="size-4 shrink-0" />
                      <span className="break-words">{store.data.location}</span>
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={store.isFetching}
                  onClick={() => void store.refetch()}
                >
                  <RefreshCw className="mr-2 size-4" />
                  Refresh
                </Button>
              </div>
            </div>
            {!store.data.catalogVisible ? (
              <p className={styles.journeyEmpty}>
                The catalog has not been revealed yet. Check back soon.
              </p>
            ) : store.data.items.length === 0 ? (
              <p className={styles.journeyEmpty}>
                Merch is on its way. The catalog is empty for now.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {store.data.items.map((item) => (
                  <article
                    key={item.id}
                    className={`${styles.journeyPanel} flex flex-col gap-4`}
                  >
                    {item.imageUrl ? (
                      <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-black/20">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          unoptimized
                          className="object-contain p-2"
                        />
                      </div>
                    ) : (
                      <Package
                        className="size-8 opacity-40"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="min-w-0 break-words text-lg font-semibold">
                        {item.name}
                      </h2>
                      <span className="shrink-0 font-semibold">
                        {item.price} pts
                      </span>
                    </div>
                    {item.description && (
                      <p className="whitespace-pre-wrap break-words text-sm opacity-80">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-auto space-y-1 border-t border-white/10 pt-3 text-sm">
                      <p>
                        {item.soldOut
                          ? "Sold out"
                          : item.stock === null
                            ? "Available"
                            : `${item.stock} in stock`}
                      </p>
                      <p className="font-semibold">
                        {item.soldOut
                          ? "Check back for a restock"
                          : store.data.available >= item.price
                            ? "You can afford this"
                            : `${item.price - store.data.available} more points needed`}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <p className={styles.journeyIntro}>
              Spending points here does not change your earned points or
              leaderboard rank.
            </p>
          </>
        )}
      </section>
    </KhixDashboardShell>
  );
}
