import Image from "next/image";

import { AssetCredit } from "../../assets";
import { AboutGallery } from "./AboutGallery";
import styles from "./AboutSection.module.css";

export function AboutSection() {
  return (
    <section id="about" className={styles.about} aria-labelledby="about-title">
      <AssetCredit
        className={styles.leftRune}
        label="Art by"
        credits={[
          {
            name: "Adrian Osorio",
            href: "https://www.linkedin.com/in/adrianosoriob/",
          },
        ]}
      >
        <Image
          src="https://assets.knighthacks.org/khix/about-rock.webp"
          alt=""
          fill
          sizes="(max-width: 760px) 48vw, 24vw"
          className={styles.rockImage}
        />
        <Image
          src="https://assets.knighthacks.org/khix/about-rock-glow.webp"
          alt=""
          fill
          sizes="(max-width: 760px) 48vw, 24vw"
          className={styles.glowImage}
        />
      </AssetCredit>
      <AssetCredit
        className={styles.rightStump}
        label="Art by"
        credits={[
          {
            name: "Adrian Osorio",
            href: "https://www.linkedin.com/in/adrianosoriob/",
          },
        ]}
      >
        <Image
          src="https://assets.knighthacks.org/khix/about-stump.webp"
          alt=""
          width={629}
          height={755}
          sizes="(max-width: 760px) 62vw, (max-width: 1199px) 38vw, 34vw"
          unoptimized
        />
      </AssetCredit>
      <div className={styles.content}>
        <div className={styles.storyRow}>
          <div className={styles.copy}>
            <div className={styles.introStory}>
              <h2 id="about-title" className={styles.storyTitle}>
                Join us at Florida’s best hackathon
              </h2>
              <p>
                From October 9–11, step into Knight Hacks IX, a 36-hour
                experience built around curiosity, creativity, and community.
                Spend the weekend chasing ideas, meeting new people, and
                discovering what you can create when everyone around you is
                building too.
              </p>
              <p>
                Explore workshops, mentor sessions, sponsor challenges,
                late-night activities, and focused time with your team. Bring an
                idea or find one along the way. Knight Hacks gives you the
                people, energy, and space to make it happen.
              </p>
              <p>
                The event is free for accepted hackers, with meals, snacks, and
                drinks provided throughout the weekend.
              </p>
            </div>

            <div className={styles.secondaryStory}>
              <h3 className={styles.storySubtitle}>Start wherever you are</h3>
              <p>
                You don’t need a polished idea, a complete team, or years of
                experience. First-time and returning hackers alike will find a
                place to take creative risks, learn by doing, and contribute in
                their own way.
              </p>
              <p>
                Bring your curiosity and your perspective. Leave with a project
                you’re proud of, people you’ll want to build with again, and a
                weekend you won’t forget.
              </p>
            </div>
          </div>
          <AboutGallery />
        </div>

        <div className={styles.metricsPanel}>
          <h3 className={styles.successTitle}>Last year at Knight Hacks</h3>
          <dl className={styles.metrics}>
            <div className={styles.metric}>
              <dt className={styles.metricNumber}>1,000+</dt>
              <dd>Hackers</dd>
            </div>
            <div className={styles.metric}>
              <dt className={styles.metricNumber}>188</dt>
              <dd>Projects</dd>
            </div>
            <div className={styles.metric}>
              <dt className={styles.metricNumber}>75</dt>
              <dd>Activities</dd>
            </div>
            <div className={styles.metric}>
              <dt className={styles.metricNumber}>$60,000</dt>
              <dd>in Prizes</dd>
            </div>
            <div className={styles.metric}>
              <dt className={styles.metricNumber}>Awarded</dt>
              <dd>UCF&apos;s Best Large-Scale Event</dd>
            </div>
            <div className={styles.metric}>
              <dt className={styles.metricNumber}>9.2/10</dt>
              <dd>Average Hacker Rating</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
