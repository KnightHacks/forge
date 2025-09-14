import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export function WhyKnightHacksSection() {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Why KnightHacks Dev Team?</h2>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="leading-relaxed text-muted-foreground">
            Being part of KnightHacks has shown me the incredible impact this
            organization has on UCF's tech community. I'd love the opportunity
            to contribute to the development side and help build the platforms
            that make our events and initiatives successful.
          </p>

          <p className="leading-relaxed text-muted-foreground">
            What excites me most is working on projects that directly benefit
            other students. There's something really rewarding about knowing
            your code is helping connect people with opportunities or improving
            their experience at hackathons and tech events.
          </p>

          <p className="leading-relaxed text-muted-foreground">
            I'm still growing as a developer, but I'm someone who thrives on new
            challenges and enjoys collaborating with others to solve problems.
            Being part of the dev team would let me contribute meaningfully
            while learning from experienced developers who can help me improve
            up my skills.
          </p>

          <p className="leading-relaxed text-muted-foreground">
            I'm eager to be part of something that makes a real difference in
            the community while doing what I'm passionate about.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
