import styles from "./page.module.css";

const projects = [
  {
    title: "Knowledge Garden 🌷",
    tech: "Django - Python - SQL",
    description:
      "A notes app I made with Django where users can organize entries by topic and keep their notes private.",
  },
  {
    title: "Thyroid Tracker 🌱",
    tech: "Django - Python - SQL",
    description:
      "A health tracker for logging symptoms, medications, and lab results, with an option to export everything into a PDF.",
  },
  {
    title: "BubbleFlow 🧋",
    tech: "Flask - Python - REST API",
    description:
      "A Flask API for tracking boba shop inventory and estimating how many servings are left from current stock.",
  },
];

export default function JesicaBermudesPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <a href="#projects">projects</a>
        <a href="#about">about</a>
        <a href="https://github.com/Cherriuu" target="_blank" rel="noreferrer">
          github
        </a>
        <a
          href="https://cherriuu.github.io/my-portfolio"
          target="_blank"
          rel="noreferrer"
        >
          portfolio
        </a>
      </nav>

      <section className={styles.hero}>
        <p className={styles.label}>computer science @ UCF</p>
        <h1>
          hi, i'm <span>Jesica</span>
        </h1>
        <p className={styles.intro}>
          I'm a computer science student who enjoys web development and building
          applications.
        </p>
        <div className={styles.buttons}>
          <a href="#projects" className={styles.primary}>
            see my work
          </a>
          <a
            href="/jesica-bermudes-resume.pdf"
            target="_blank"
            rel="noreferrer"
            className={styles.secondary}
          >
            resume
          </a>
        </div>
      </section>

      <section className={styles.section} id="projects">
        <h2>things i've built</h2>
        <div className={styles.projectList}>
          {projects.map((project) => (
            <div className={styles.card} key={project.title}>
              <h3>{project.title}</h3>
              <p className={styles.tech}>{project.tech}</p>
              <p>{project.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} id="about">
        <p className={styles.label}>about</p>
        <h2>a little about me</h2>
        <div className={styles.card}>
          <p>
            I like learning by making things. Usually I start a project because
            there's something I want to figure out, and I learn whatever I need
            along the way.
          </p>
          <p>
            I'm especially interested in web development, Python, and math, and
            I enjoy projects where I get to mix problem solving with something
            creative.
          </p>
          <p>
            I'm still exploring what areas of computer science I want to grow
            into, but I know I enjoy creating things, solving problems, and
            picking up new technologies as I go.
          </p>
        </div>
      </section>
    </main>
  );
}
