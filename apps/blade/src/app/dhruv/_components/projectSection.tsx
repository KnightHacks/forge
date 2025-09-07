import { Badge } from "@forge/ui/badge"
import { Link } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@forge/ui/card"

interface ProjectType {
  type: "webdev" | "aiml" | "other"
  name: string
  description?: string
  images?: string[]
}


export default function ProjectSection({projects, name} : {projects: ProjectType[], name: string}){
	return(
            <div className="relative">
              <div className="flex items-center gap-4 mb-10">
                <div>
                  <h3 className="text-3xl font-bold text-primary">{name}</h3>
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project, index) => (
                  <Card
                    key={index}
                    className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-card/50 backdrop-blur-sm hover:bg-card/80"
                  >
                    {project.images?.[0] && (
                      <div className="overflow-hidden rounded-t-lg">
                      </div>
                    )}
                    <CardHeader className="p-6">
                      <CardTitle className="text-xl text-balance group-hover:text-primary transition-colors duration-300">
                        {project.name}
                      </CardTitle>
                      {project.description && (
                        <CardDescription className="text-pretty leading-relaxed">{project.description}</CardDescription>
                      )}
                      {project.description?.startsWith("Puzzle pla") && (
												<a
												href="https://plasman3050.itch.io/you-again"
													target="_blank"
												rel="noopener noreferrer"
												>
                        <Badge
                          variant="secondary"
                          className="text-sm gap-2 flex px-3 py-1 w-fit mt-3 hover:bg-primary/10 transition-colors"
                        >
                            <Link className="w-4 h-4" /> You, Again?
                        </Badge>
												</a>
                      )}

                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
	)
}
