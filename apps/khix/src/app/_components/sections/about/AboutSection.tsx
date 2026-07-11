import styles from "./AboutSection.module.css";

export function AboutSection() {
  return (
    <section id="about" className={styles.about} aria-labelledby="about-title">
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
