import type { Metadata } from "next";

import { ArchiveShell } from "~/components/archive-shell";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ArchiveShell>
      <div className="my-4 flex w-full flex-col items-center justify-start md:my-12">
        <h1 className="font-sansita mt-20 text-center text-4xl sm:text-4xl md:text-6xl">
          About Us
        </h1>
        <div className="my-2 flex w-2/3 flex-col items-center sm:text-base md:text-xl xl:text-xl">
          <section className="font-palanquin mb-2 mt-4 text-left">
            <h2 className="font-sansita mb-4 mt-16 text-left text-xl sm:text-xl md:text-3xl">
              Who are we?
            </h2>
            <p>
              Founded in 2015, Knight Hacks is a Registered Student Organization
              (RSO) at the University of Central Florida that covers all things
              tech and software development, as well as host our annual
              hackathon attended by students from around the world!
            </p>
            <p className="archive-copy-gap">
              We host club events throughout every semester, which you can check
              out on our{" "}
              <a
                className="archive-inline-link"
                href="https://www.knighthacks.org"
              >
                website
              </a>
              . Any and all students at UCF are welcome at our weekly events!
            </p>
          </section>
          <section className="font-palanquin mb-2 text-left">
            <h2 className="font-sansita mb-4 mt-12 text-left text-xl sm:text-xl md:text-3xl">
              Our Hackathon
            </h2>
            <p>
              Connect, collaborate, and create with over 700 of the brightest
              and most enthusiastic developers, engineers, and designers in the
              south-east and around the world!
            </p>
            <p className="archive-copy-gap">
              Whether you&apos;re a season hacker or a complete tech newbie,
              Knight Hacks welcomes you! Just bring an open mind and a
              insatiable desire to learn, and we&apos;ll take care of the rest.
            </p>
            <p className="archive-copy-gap">
              Create a product, learn new skills, and have fun with friends old
              and new - all in 36 hours!
            </p>
          </section>
          <section className="font-palanquin mb-2 text-left">
            <h2 className="font-sansita mb-4 mt-12 text-left text-xl sm:text-xl md:text-3xl">
              Beginner Track
            </h2>
            <p>
              First time hacker? Don&apos;t have a lot of programming
              experience? Don&apos;t worry! Here&apos;s how we plan to make our
              hackathon beginner friendly.
            </p>
            <h3 className="archive-subhead">Beginner Friendly Hacker Packet</h3>
            <ul className="archive-content-list">
              <li>
                This will include information to provide insight and inspiration
                to start developing a project.
              </li>
              <li>
                It includes times and descriptions of all the beginner focused
                events that we are going to have.
              </li>
            </ul>
            <h3 className="archive-subhead">Beginner Workshops</h3>
            <p>
              These will require little to any knowledge and introduce key
              knowledge for developing a project such as
              wireframing/prototyping, JavaScript, Python, and more!
            </p>
            <h3 className="archive-subhead">Beginner Prize Track</h3>
            <p>
              The purpose of this prize track is to encourage new hackers to
              submit and learn something by the end of the hackathon! Some
              judging criteria for this prize will primarily be based on having
              a strong and clear project proposal such as a good
              wireframe/prototype, clear project requirements, and researching
              what technologies would be needed to fully implement the idea.
            </p>
            <h3 className="archive-subhead">General Prize Track</h3>
            <p className="archive-bottom-gap">
              Choosing the beginner track does not disqualify you from winning a
              general track prize.
            </p>
          </section>
        </div>
      </div>
    </ArchiveShell>
  );
}
