import { LockKeyhole, Workflow } from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";

interface FormCallbackCatalogItem {
  canConfigure: boolean;
  description: string;
  id: string;
  label: string;
  requiredAccess: string;
}

export function FormCallbackCatalog({
  callbacks,
}: {
  callbacks: FormCallbackCatalogItem[];
}) {
  return (
    <section
      aria-label="Callbacks and automations"
      className="space-y-3 rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/15 sm:p-5"
    >
      <div>
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Callbacks and automations</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Registered internal actions that run after a response is accepted.
        </p>
      </div>

      <div className="grid gap-3">
        {callbacks.map((callback) => (
          <article
            key={callback.id}
            className="grid gap-3 rounded-md border border-white/10 bg-background/60 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{callback.label}</h3>
                {!callback.canConfigure && (
                  <Badge variant="outline" className="gap-1.5">
                    <LockKeyhole className="h-3 w-3" aria-hidden="true" />
                    Permission required
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {callback.description}
              </p>
              {!callback.canConfigure && (
                <p
                  id={`callback-requirement-${callback.id}`}
                  className="mt-2 text-sm text-muted-foreground"
                >
                  <span className="font-medium text-foreground">
                    Required access:
                  </span>{" "}
                  {callback.requiredAccess}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 focus-visible:ring-2"
              disabled={!callback.canConfigure}
              aria-disabled={!callback.canConfigure}
              aria-describedby={
                callback.canConfigure
                  ? undefined
                  : `callback-requirement-${callback.id}`
              }
            >
              Configure
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
