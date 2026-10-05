"use client";

import Image from "next/image";
import { MapPin, Package, RefreshCw } from "lucide-react";

import {
  useHackerDashboard,
  useHackerPointStore,
} from "@forge/hacker-sdk/react";
import { Button } from "@forge/ui/button";

import styles from "./khix-dashboard.module.css";

export function KhixMerchStore() {
  const dashboard = useHackerDashboard();
  const store = useHackerPointStore();
  const checkedIn = dashboard.data?.application?.status === "checkedin";
  return (
    <section className={styles.journeyExperience} aria-labelledby="merch-title">
      <header className={styles.journeyHero}>
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
        <div role="alert" className={styles.merchNotice}>
          <p>Could not check your status.</p>
          <Button
            className={styles.ghostButton}
            onClick={() => void dashboard.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : !checkedIn ? (
        <div className={styles.merchNotice}>
          <h2>Unlocks at check-in</h2>
          <p className={styles.journeyIntro}>
            Check in at the hackathon to browse merch and see what you can
            afford.
          </p>
        </div>
      ) : store.isPending ? (
        <p role="status">Loading catalog…</p>
      ) : store.isError ? (
        <div role="alert" className={styles.merchNotice}>
          <p>The store could not be loaded.</p>
          <Button
            className={styles.ghostButton}
            onClick={() => void store.refetch()}
          >
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
          <div className={styles.merchStatus}>
            <div className={styles.merchNotice}>
              <h2>{store.data.open ? "Open for pickup" : "Store closed"}</h2>
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
              className={styles.ghostButton}
              disabled={store.isFetching}
              onClick={() => void store.refetch()}
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
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
            <div className={styles.merchCatalog}>
              {store.data.items.map((item) => (
                <article key={item.id} className={styles.merchItem}>
                  <div className={styles.merchImage}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    ) : (
                      <Package className="size-8" aria-hidden="true" />
                    )}
                  </div>
                  <div className={styles.merchDetails}>
                    <div className={styles.merchItemHeading}>
                      <h2>{item.name}</h2>
                      <span className={styles.merchPrice}>
                        {item.price} pts
                      </span>
                    </div>
                  </div>
                  <div
                    className={styles.merchAvailability}
                    data-status={
                      item.soldOut
                        ? "sold-out"
                        : store.data.available < item.price
                          ? "more-points"
                          : "available"
                    }
                  >
                    <p>
                      {item.soldOut
                        ? "Sold out"
                        : store.data.available < item.price
                          ? `${item.price - store.data.available} more points needed`
                          : item.stock === null
                            ? "Available"
                            : `${item.stock} in stock`}
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
  );
}
