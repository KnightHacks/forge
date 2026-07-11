import Image from "next/image";

import { AboutGallery } from "./AboutGallery";
import styles from "./AboutSection.module.css";

export function AboutSection() {
  return (
    <section id="about" className={styles.about} aria-labelledby="about-title">
      <div className={styles.leftRune} aria-hidden="true">
        <Image
          src="/assets/about-rock.webp"
          alt=""
          fill
          sizes="(max-width: 760px) 48vw, 24vw"
          className={styles.rockImage}
        />
        <Image
          src="/assets/about-rock-glow.webp"
          alt=""
          fill
          sizes="(max-width: 760px) 48vw, 24vw"
          className={styles.glowImage}
        />
      </div>
      <h2 id="about-title" className={styles.title}>
        About
      </h2>
      <div className={styles.content}>
        <div className={styles.metricsPanel}>
          <h3 className={styles.successTitle}>Last year was a success.</h3>
          <dl className={styles.metrics}>
            <div className={styles.metric}>
              <dt>$60,000</dt>
              <dd>in prizes</dd>
            </div>
            <div className={styles.metric}>
              <dt>1,000+</dt>
              <dd>hackers</dd>
            </div>
            <div className={styles.metric}>
              <dt>9.2/10</dt>
              <dd>average hacker rating</dd>
            </div>
            <div className={styles.metric}>
              <dt>75</dt>
              <dd>activities</dd>
            </div>
            <div className={styles.metric}>
              <dt>Voted</dt>
              <dd>UCF&apos;s best large-scale event</dd>
            </div>
            <div className={styles.metric}>
              <dt>188</dt>
              <dd>projects</dd>
            </div>
          </dl>
        </div>

        <div className={styles.storyRow}>
          <div className={styles.copy}>
            <p>
              The University of Central Florida&apos;s premiere hackathon,
              Knight Hacks IX, emerges from the forest.
            </p>
            <p>
              During this 36-hour coding journey, hackers will build with
              creativity, code, and community as they bring their best ideas to
              life.
            </p>
          </div>
          <AboutGallery />
        </div>
      </div>
    </section>
  );
}
