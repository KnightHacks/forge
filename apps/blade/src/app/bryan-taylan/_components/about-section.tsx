import { CodeIcon, PersonIcon, ReaderIcon } from "@forge/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export function AboutSection() {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">About</h2>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="mb-4 flex justify-center">
              <CodeIcon className="h-12 w-12 text-white" />
            </div>
            <h3 className="mb-3 text-lg font-semibold">Software Developer</h3>
            <p className="leading-relaxed text-muted-foreground">
              I'm passionate about problem solving through code and building
              applications that make a difference. I enjoy learning new
              technologies and tackling challenging projects.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="mb-4 flex justify-center">
              <PersonIcon className="h-12 w-12 text-white" />
            </div>
            <h3 className="mb-3 text-lg font-semibold">Team Collaborator</h3>
            <p className="leading-relaxed text-muted-foreground">
              I thrive in collaborative environments and enjoy contributing to
              team projects. I'm always eager to learn from others and share
              knowledge.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="mb-4 flex justify-center">
              <ReaderIcon className="h-12 w-12 text-white" />
            </div>
            <h3 className="mb-3 text-lg font-semibold">Continuous Learner</h3>
            <p className="leading-relaxed text-muted-foreground">
              I'm constantly expanding my technical skills through coursework,
              personal projects, and exploring new frameworks and tools in the
              development ecosystem.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
