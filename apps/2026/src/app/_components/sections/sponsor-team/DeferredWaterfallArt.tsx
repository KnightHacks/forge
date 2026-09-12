"use client";

import { AmbientVideo } from "../../AmbientVideo";
import { getTransparentVideoSources } from "../../ambientVideoSources";
import { AssetCredit } from "../../assets";
import { useViewportActivity } from "../../useViewportActivity";
import styles from "./SponsorTeamSection.module.css";
import { WaterfallAtmosphere } from "./WaterfallAtmosphere";

/** Returns responsive transparent-video sources for one waterfall segment. */
const getWaterfallSources = (waterfall: "one" | "two" | "three") => [
  ...getTransparentVideoSources(
    `/media/homepage/waterfall-${waterfall}-mobile`,
  ).map((source) => ({ ...source, media: "(max-width: 760px)" })),
  ...getTransparentVideoSources(
    `/media/homepage/waterfall-${waterfall}-balanced`,
  ).map((source) => ({ ...source, media: "(min-width: 761px)" })),
];

/** Renders the three waterfall segments with center-weighted decode lifecycles. */
export function DeferredWaterfallArt() {
  const [artRef, isArtNearby] = useViewportActivity<HTMLDivElement>({
    respectReducedMotion: false,
    rootMargin: "100% 0px",
  });

  return (
    <div ref={artRef} className={styles.waterfallVisuals}>
      <AssetCredit
        className={styles.waterfallTransition}
        label="Separator art by"
        credits={[
          {
            name: "Adrian Osorio",
            href: "https://www.linkedin.com/in/adrianosoriob/",
          },
        ]}
      >
        {isArtNearby ? <div className={styles.sponsorRockSeparator} /> : null}
      </AssetCredit>

      <div className={styles.scene} aria-hidden="true">
        {isArtNearby ? (
          <>
            <span className={`${styles.sceneAsset} ${styles.rocksTop}`} />
            <span className={`${styles.sceneAsset} ${styles.rocksBottom}`} />
            <AmbientVideo
              className={`${styles.sceneAsset} ${styles.waterfallOne}`}
              rootMargin="-45% 0px"
              sources={getWaterfallSources("one")}
            />
            <AmbientVideo
              className={`${styles.sceneAsset} ${styles.waterfallTwo}`}
              rootMargin="-45% 0px"
              sources={getWaterfallSources("two")}
            />
            <AmbientVideo
              className={`${styles.sceneAsset} ${styles.waterfallThree}`}
              rootMargin="-45% 0px"
              sources={getWaterfallSources("three")}
            />
          </>
        ) : null}
      </div>

      {isArtNearby ? <WaterfallAtmosphere /> : null}
      {isArtNearby ? (
        <div className={styles.bridge} aria-hidden="true" />
      ) : null}
    </div>
  );
}
