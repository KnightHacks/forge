import styles from "../../_components/khix-dashboard.module.css";

export default function HackerGuidePage() {
  return (
    <section className={styles.guidePage} aria-label="Hacker’s Guide">
      <iframe
        className={styles.guideFrame}
        src="https://knight-hacks.notion.site/ebd//334e290ccffe80e39ec7ee1e20a33bae"
        title="Knight Hacks IX Hacker’s Guide"
        width="100%"
        height="600"
        allowFullScreen
      />
    </section>
  );
}
