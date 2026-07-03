import Image from "next/image";

import styles from "./AboutSection.module.css";

const ABOUT_ASSET_PATH = "/assets/about";

export function AboutSection() {
  return (
    <section id="about" className={styles.about} aria-labelledby="about-title">
      <div className={styles.decoration} aria-hidden="true">
        <Image
          src={`${ABOUT_ASSET_PATH}/log.png`}
          alt=""
          width={2519}
          height={1902}
          sizes="(max-width: 760px) 92vw, 48vw"
          unoptimized
          draggable={false}
          className={`${styles.decorAsset} ${styles.log}`}
        />
        <Image
          src={`${ABOUT_ASSET_PATH}/stump.png`}
          alt=""
          width={1947}
          height={1905}
          sizes="(max-width: 760px) 52vw, 30vw"
          unoptimized
          draggable={false}
          className={`${styles.decorAsset} ${styles.stump}`}
        />
        <Image
          src={`${ABOUT_ASSET_PATH}/grass-left.png`}
          alt=""
          width={1250}
          height={3489}
          sizes="(max-width: 760px) 42vw, 18vw"
          unoptimized
          draggable={false}
          className={`${styles.decorAsset} ${styles.rockGrass} ${styles.rockGrassLeft}`}
        />
        <Image
          src={`${ABOUT_ASSET_PATH}/grass-right.png`}
          alt=""
          width={965}
          height={3380}
          sizes="(max-width: 760px) 36vw, 15vw"
          unoptimized
          draggable={false}
          className={`${styles.decorAsset} ${styles.rockGrass} ${styles.rockGrassRight}`}
        />
        <Image
          src={`${ABOUT_ASSET_PATH}/grass-mushroom.png`}
          alt=""
          width={1709}
          height={4982}
          sizes="(max-width: 760px) 46vw, 19vw"
          unoptimized
          draggable={false}
          className={`${styles.decorAsset} ${styles.rockGrass} ${styles.rockGrassFront}`}
        />
        <span className={styles.rockStack}>
          <Image
            src={`${ABOUT_ASSET_PATH}/rock-glow.png`}
            alt=""
            width={602}
            height={917}
            sizes="(max-width: 760px) 30vw, 12vw"
            unoptimized
            draggable={false}
            className={styles.rockGlow}
          />
          <Image
            src={`${ABOUT_ASSET_PATH}/rock.png`}
            alt=""
            width={1770}
            height={2179}
            sizes="(max-width: 760px) 42vw, 18vw"
            unoptimized
            draggable={false}
            className={styles.rock}
          />
        </span>
      </div>

      <div className={styles.copy}>
        <h2 id="about-title" className={styles.title}>
          About
        </h2>
        <p>
          The University of Central Florida&apos;s premiere hackathon, Knight
          Hacks IX, emerges from the forest.
        </p>
        <p>
          During this 36-hour coding journey, hackers will build with
          creativity, code, and community as they bring their best ideas to
          life.
        </p>
      </div>
    </section>
  );
}
