import { ExternalLinkIcon } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export function ContactSection() {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Contact</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Let's Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Excited about the opportunity to contribute to KnightHacks projects!
          </p>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Button variant="outline" className="justify-start" asChild>
              <a href="mailto:bryantaylan@gmail.com">
                <div className="mr-2 flex h-4 w-4 items-center justify-center">
                  <ExternalLinkIcon className="h-3 w-3 text-white" />
                </div>
                Email
              </a>
            </Button>

            <Button variant="outline" className="justify-start" asChild>
              <a
                href="https://linkedin.com/in/bryan-taylan"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center">
                  <ExternalLinkIcon className="h-3 w-3 text-white" />
                </div>
                LinkedIn
              </a>
            </Button>

            <Button variant="outline" className="justify-start" asChild>
              <a
                href="https://github.com/BryanTaylan"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center">
                  <ExternalLinkIcon className="h-3 w-3 text-white" />
                </div>
                GitHub
              </a>
            </Button>

            <Button variant="outline" className="justify-start" asChild>
              <a
                href="https://bryan-taylan-portfolio.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon className="mr-2 h-4 w-4 text-white" />
                Portfolio
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
