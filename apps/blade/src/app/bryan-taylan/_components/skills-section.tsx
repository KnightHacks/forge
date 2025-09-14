import { Badge } from "@forge/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

interface SkillCategory {
  title: string;
  skills: string[];
}

const skillsData: SkillCategory[] = [
  {
    title: "Frontend Technologies",
    skills: ["React", "React Native", "Next.js", "JavaScript", "HTML", "CSS"],
  },
  {
    title: "Backend Technologies",
    skills: ["Python", "Node.js", "Flask"],
  },
  {
    title: "Database & Storage",
    skills: ["SQL"],
  },
  {
    title: "Cloud & DevOps",
    skills: ["AWS", "Git"],
  },
];

export function SkillsSection() {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Technical Skills</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {skillsData.map((category, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{category.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
