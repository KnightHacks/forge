import Link from "next/link";
import {
  Archive,
  FileText,
  Pencil,
  Plus,
  Settings2,
  Share2,
} from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Input } from "@forge/ui/input";

import { AdminFormsSectionSelect } from "./admin-forms-section-select";

interface AdminFormsAccess {
  canEdit: boolean;
  canManageSections: boolean;
  canRead: boolean;
  canReadResponses: boolean;
  isOfficer: boolean;
}

interface AdminFormItem {
  access: {
    canEdit: boolean;
    canReadResponses: boolean;
  };
  closesAt: string | null;
  id: string;
  manualClosed: boolean;
  name: string;
  opensAt: string | null;
  responseCount: number;
  responseMode: "multiple_locked" | "single_editable" | "single_locked";
  section: { id: string; name: string };
  slugName: string;
  state: "archived" | "draft" | "published";
}

interface AdminFormsData {
  forms: AdminFormItem[];
  pagination: {
    page: number;
    pageCount: number;
    pageSize: number;
    totalCount: number;
  };
  sections: { id: string; name: string }[];
}

interface AdminFormsInput {
  page: number;
  pageSize: number;
  query: string;
  sectionIds: string[];
  states: ("archived" | "draft" | "published")[];
  view: "active" | "archive";
}

function titleCase(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function formsHref({
  query,
  sectionId,
  view,
}: {
  query: string;
  sectionId?: string;
  view: AdminFormsInput["view"];
}) {
  const params = new URLSearchParams();
  if (view === "archive") params.set("view", "archive");
  if (query) params.set("query", query);
  if (sectionId) params.set("section", sectionId);
  const search = params.toString();
  return `/admin/forms${search ? `?${search}` : ""}`;
}

export function AdminFormsDashboard({
  access,
  data,
  input,
}: {
  access: AdminFormsAccess;
  data: AdminFormsData;
  input: AdminFormsInput;
}) {
  const canEdit = access.canEdit || access.isOfficer;
  const canManageSections = access.canManageSections || access.isOfficer;
  const selectedSectionId = input.sectionIds[0];
  const selectedSection = data.sections.find(
    (section) => section.id === selectedSectionId,
  );
  const formGroups = (selectedSection ? [selectedSection] : data.sections)
    .map((section) => ({
      forms: data.forms.filter((form) => form.section.id === section.id),
      section,
    }))
    .filter((group) => group.forms.length > 0);

  return (
    <main
      data-forms-admin-layout="responsive"
      className="container min-w-0 space-y-5 pb-16 pt-5 sm:space-y-6 sm:pt-8"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Administration</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
            Form administration
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Build, publish, share, and review identified member forms.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageSections && (
            <Button
              asChild
              variant="outline"
              className="min-h-11 gap-2 focus-visible:ring-2"
            >
              <Link href="/admin/forms/sections">
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                Manage sections
              </Link>
            </Button>
          )}
          {canEdit && (
            <Button asChild className="min-h-11 gap-2 focus-visible:ring-2">
              <Link href="/admin/forms/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create form
              </Link>
            </Button>
          )}
        </div>
      </header>

      <nav
        aria-label="Form views"
        className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-card/95 p-1 shadow-lg shadow-black/15"
        data-section-context={selectedSectionId ?? "all"}
      >
        <Button
          asChild
          variant={input.view === "active" ? "secondary" : "ghost"}
          className="min-h-11 focus-visible:ring-2"
        >
          <Link
            href={formsHref({
              query: input.query,
              sectionId: selectedSectionId,
              view: "active",
            })}
          >
            Forms
          </Link>
        </Button>
        <Button
          asChild
          variant={input.view === "archive" ? "secondary" : "ghost"}
          className="min-h-11 gap-2 focus-visible:ring-2"
        >
          <Link
            href={formsHref({
              query: input.query,
              sectionId: selectedSectionId,
              view: "archive",
            })}
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
            Archive
          </Link>
        </Button>
        <AdminFormsSectionSelect
          sections={data.sections}
          selectedSectionId={selectedSectionId}
        />
      </nav>

      <section
        aria-label="Forms"
        className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25"
      >
        <div className="border-b border-border/70 p-3 sm:p-4">
          <form
            className="flex min-w-0 flex-col gap-2 sm:flex-row"
            method="get"
            role="search"
          >
            {input.view === "archive" && (
              <input name="view" type="hidden" value="archive" />
            )}
            {selectedSectionId && (
              <input name="section" type="hidden" value={selectedSectionId} />
            )}
            <label className="sr-only" htmlFor="form-search">
              Search forms
            </label>
            <Input
              type="search"
              aria-label="Search forms"
              defaultValue={input.query}
              id="form-search"
              name="query"
              placeholder="Search forms"
              className="h-11 min-w-0 flex-1 text-base focus-visible:ring-2 sm:text-sm"
            />
            <Button
              className="min-h-11 focus-visible:ring-2"
              type="submit"
              variant="outline"
            >
              Search
            </Button>
          </form>
        </div>

        {!access.canRead && !access.isOfficer ? (
          <p role="status" className="p-6 text-sm text-muted-foreground">
            You do not have access to inspect forms.
          </p>
        ) : data.forms.length === 0 ? (
          <p
            role="status"
            className="p-8 text-center text-sm text-muted-foreground"
          >
            No forms match this view.
          </p>
        ) : (
          <div className="grid gap-6 p-3 sm:p-5">
            {formGroups.map((group) => (
              <section
                aria-labelledby={`forms-section-${group.section.id}`}
                className="grid gap-3"
                key={group.section.id}
              >
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-1 pb-2">
                  <h2
                    className="text-base font-semibold"
                    id={`forms-section-${group.section.id}`}
                  >
                    {group.section.name}
                  </h2>
                  <Badge variant="outline">
                    {group.forms.length}{" "}
                    {group.forms.length === 1 ? "form" : "forms"}
                  </Badge>
                </div>
                {group.forms.map((form) => (
                  <Card
                    key={form.id}
                    className="gap-4 border-white/10 bg-background/60 py-4 shadow-none"
                  >
                    <CardHeader className="gap-3 px-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {!selectedSection && (
                            <Badge variant="outline">{form.section.name}</Badge>
                          )}
                          <Badge variant="secondary">
                            {titleCase(form.state)}
                          </Badge>
                        </div>
                        <CardTitle className="mt-3 flex min-w-0 items-center gap-2 text-lg leading-tight">
                          <FileText
                            className="h-4 w-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <span className="break-words">{form.name}</span>
                        </CardTitle>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {form.responseCount}{" "}
                          {form.responseCount === 1 ? "response" : "responses"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="min-h-11 gap-2 focus-visible:ring-2 sm:min-h-9"
                        >
                          <Link href={`/admin/forms/${form.id}?dialog=share`}>
                            <Share2 className="h-4 w-4" aria-hidden="true" />
                            Share
                          </Link>
                        </Button>
                        {form.access.canReadResponses && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="min-h-11 focus-visible:ring-2 sm:min-h-9"
                          >
                            <Link href={`/admin/forms/${form.id}/responses`}>
                              View responses
                            </Link>
                          </Button>
                        )}
                        {form.access.canEdit && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="min-h-11 gap-2 focus-visible:ring-2 sm:min-h-9"
                          >
                            <Link href={`/admin/forms/${form.id}`}>
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              Edit form
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="sr-only px-4">
                      Stable link slug: {form.slugName}
                    </CardContent>
                  </Card>
                ))}
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
