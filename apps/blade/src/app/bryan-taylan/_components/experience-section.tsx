import { Badge } from "@forge/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

interface ExperienceItem {
  title: string;
  company: string;
  period: string;
  experiences: string[];
  technologies: string[];
}

const experienceData: ExperienceItem[] = [
  {
    title: "Software Developer Intern",
    company: "NextGen Software",
    period: "May 2025 - Aug 2025",
    experiences: [
      "Built React Native components for HeyNay app admin interface",
      "Collaborated on UI/UX design and styling",
      "Implemented Nest.js backend services with S3 integration",
      "Assisted with DynamoDB development",
    ],
    technologies: ["React Native", "Nest.js", "AWS S3", "DynamoDB"],
  },
  {
    title: "Software Developer Intern",
    company: "NextGen Software",
    period: "Jun 2023 - Aug 2023",
    experiences: [
      "Modernized UI of Tier 25 app using React",
      "Improved SEO and responsiveness of company homepage",
      "Optimized code and components for better performance",
    ],
    technologies: ["React", "SEO", "Frontend Optimization"],
  },
  {
    title: "President, Math Club",
    company: "Palm Beach State College",
    period: "May 2024 - Jul 2024",
    experiences: [
      "Led weekly workshops and competitions",
      "Managed club budget and event planning",
      "Increased active membership by 25%",
    ],
    technologies: ["Leadership", "Event Management", "Team Building"],
  },
];

export function ExperienceSection() {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Experience</h2>
      <div className="space-y-4">
        {experienceData.map((exp, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{exp.title}</CardTitle>
                  <p className="font-medium text-muted-foreground">
                    {exp.company}
                  </p>
                </div>
                <Badge variant="secondary">{exp.period}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="mb-4 list-inside list-disc space-y-2 text-muted-foreground">
                {exp.experiences.map((experience, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {experience}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {exp.technologies.map((tech) => (
                  <Badge key={tech} variant="outline" className="text-xs">
                    {tech}
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
