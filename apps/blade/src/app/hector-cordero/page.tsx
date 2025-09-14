import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Hector Cordero | KnightHacks Dev Application",
  description: "Calm luh Application, nun too crazy",
};

export default function Page() {
  return (
    <main>
      {/* -------------------------------------------------------Header----------------------------------------------------------------- */}
      <div className="flex items-center gap-6">
        <label htmlFor="avatar-modal">
          <Image
            src="/hector.jpg"
            alt="Hector Cordero"
            fill
            sizes="130px"
            priority
          />
        </label>

        <div>
          <h1 className="font-bold tracking-tight">
            <span>Hector Cordero</span>
          </h1>

          <p>Rising sophomore | Building with TypeScript &amp; Next.js</p>
        </div>
      </div>

      {/*-------------------------------------------------------------------------------------------------------------*/}

      {/*-------------------------------------------------------Actions-----------------------------------------------------------------*/}
      <div>
        <Link href="/Resume2025.pdf">Resume</Link>

        <Link href="https://www.linkedin.com/in/hectorhcordero"></Link>
      </div>
      {/*-------------------------------------------------------------------------------------------------------------*/}

      {/*-------------------------------------------------------Body-----------------------------------------------------------------*/}

      <div>
        <p>
          Wassup! I'm Hector and I'm a rising sophomore. I'm on the come up!
        </p>

        <p>These are the tools/concepts I'm learning:</p>
        <ul>
          <li>Next.js and NextAuth.js</li>
          <li>SEO Optimization</li>
          <li>Postgres</li>
          <li>Tailwind CSS and UI/UX Design</li>
          <li>TypeScript</li>
        </ul>

        <p>
          Since running cross country in high school, I loved being part of a
          team. It makes what you do more fun and you get to make friends along
          the way. This is why I want to join the dev team. I know I’ll be
          surrounded by like-minded people, and together we’ll contribute to a
          great organization whose focus is to help people like me.
        </p>

        <p>
          Programming aside, I’m a hooper and I dabble in other sports. My
          favorite anime is Hunter x Hunter. I’m also always down for eats LOL.
          Hope I get to meet y’all soon!
        </p>
      </div>

      {/* ------------------------------------------------------------------------------------------------------------- */}

      {/* -------------------------------------------------Cover at Full Size----------------------------------------------------- */}

      <label htmlFor="avatar-modal">
        <Image
          src="/hector.jpg"
          alt="Hector Cordero"
          width={1200}
          height={1200}
          priority
        />
      </label>

      {/* ------------------------------------------------------------------------------------------------------------- */}
    </main>
  );
}
