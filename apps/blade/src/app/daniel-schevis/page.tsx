import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import { Separator } from "@forge/ui/separator";
import { 
  Github, 
  Linkedin, 
  Mail, 
  Phone, 
  MapPin, 
  Code, 
  GraduationCap,
  User,
  Briefcase,
  Trophy,
  Heart
} from "lucide-react";

export default function DanielSchevisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
              DS
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Daniel Schevis
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Passionate Software Developer & Knight Hacks Team Member Applicant
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <Button variant="outline" size="sm" className="gap-2">
                <Mail className="w-4 h-4" />
                daniel.schevis@example.com
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Phone className="w-4 h-4" />
                (555) 123-4567
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <MapPin className="w-4 h-4" />
                Orlando, FL
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex justify-center space-x-4">
            <Button className="gap-2">
              <Github className="w-4 h-4" />
              GitHub
            </Button>
            <Button variant="outline" className="gap-2">
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </Button>
            <Button variant="outline" className="gap-2">
              <User className="w-4 h-4" />
              Resume
            </Button>
          </div>

          <Separator />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - About & Contact */}
            <div className="space-y-6">
              
              {/* About Me Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    About Me
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    I'm a passionate computer science student at UCF with a strong foundation in 
                    full-stack development. I love building innovative solutions and contributing 
                    to open-source projects.
                  </p>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Interests:</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Web Development</Badge>
                      <Badge variant="secondary">Machine Learning</Badge>
                      <Badge variant="secondary">Open Source</Badge>
                      <Badge variant="secondary">Hackathons</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Education Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold">University of Central Florida</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Bachelor of Science in Computer Science
                      </p>
                      <p className="text-sm text-gray-500">Expected Graduation: May 2026</p>
                      <p className="text-sm text-gray-500">GPA: 3.8/4.0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Why Knight Hacks Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Why Knight Hacks?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    I'm passionate about joining Knight Hacks because of the organization's 
                    commitment to fostering innovation and building a strong tech community 
                    at UCF. I want to contribute my skills while learning from experienced 
                    developers and helping create amazing experiences for fellow students.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Skills & Experience */}
            <div className="space-y-6">
              
              {/* Technical Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Technical Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Programming Languages</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge>JavaScript</Badge>
                      <Badge>TypeScript</Badge>
                      <Badge>Python</Badge>
                      <Badge>Java</Badge>
                      <Badge>C++</Badge>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Frameworks & Libraries</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">React</Badge>
                      <Badge variant="outline">Next.js</Badge>
                      <Badge variant="outline">Node.js</Badge>
                      <Badge variant="outline">Express</Badge>
                      <Badge variant="outline">TailwindCSS</Badge>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Tools & Technologies</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Git</Badge>
                      <Badge variant="secondary">Docker</Badge>
                      <Badge variant="secondary">AWS</Badge>
                      <Badge variant="secondary">PostgreSQL</Badge>
                      <Badge variant="secondary">MongoDB</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Experience */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="border-l-2 border-purple-500 pl-4">
                      <h4 className="font-semibold">Software Development Intern</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">TechCorp Solutions</p>
                      <p className="text-xs text-gray-500">Summer 2024</p>
                      <p className="text-sm mt-1">
                        Developed React components and REST APIs, improving user experience 
                        and application performance.
                      </p>
                    </div>
                    <div className="border-l-2 border-blue-500 pl-4">
                      <h4 className="font-semibold">Freelance Web Developer</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Self-Employed</p>
                      <p className="text-xs text-gray-500">2023 - Present</p>
                      <p className="text-sm mt-1">
                        Built custom websites for local businesses using modern web technologies.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Projects & Achievements */}
            <div className="space-y-6">
              
              {/* Featured Projects */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Featured Projects
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold">Task Management App</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Full-stack web application with real-time collaboration features.
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="outline" className="text-xs">React</Badge>
                        <Badge variant="outline" className="text-xs">Node.js</Badge>
                        <Badge variant="outline" className="text-xs">Socket.io</Badge>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Github className="w-3 h-3" />
                        View Code
                      </Button>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold">AI Study Assistant</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Machine learning application that helps students optimize study schedules.
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="outline" className="text-xs">Python</Badge>
                        <Badge variant="outline" className="text-xs">TensorFlow</Badge>
                        <Badge variant="outline" className="text-xs">Flask</Badge>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Github className="w-3 h-3" />
                        View Code
                      </Button>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold">E-commerce Platform</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Modern e-commerce solution with payment processing and inventory management.
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="outline" className="text-xs">Next.js</Badge>
                        <Badge variant="outline" className="text-xs">Stripe</Badge>
                        <Badge variant="outline" className="text-xs">PostgreSQL</Badge>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Github className="w-3 h-3" />
                        View Code
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">1st Place - UCF Programming Contest 2024</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm">2nd Place - HackUCF 2023</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Open Source Contributor - 50+ commits</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Dean's List - Fall 2023, Spring 2024</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Call to Action */}
              <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <CardHeader>
                  <CardTitle>Ready to Contribute!</CardTitle>
                  <CardDescription className="text-purple-100">
                    I'm excited to bring my skills and passion to the Knight Hacks team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="secondary" className="w-full">
                    Let's Connect!
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-8 border-t">
            <p className="text-gray-500 text-sm">
              © 2025 Daniel Schevis. Built with Next.js and TailwindCSS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
