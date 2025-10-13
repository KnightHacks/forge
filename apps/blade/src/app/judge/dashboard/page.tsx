import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import { FilterBar } from "../_components/filter-bar";
import { ProjectsTable } from "../_components/projects-table";
import { SearchBar } from "../_components/search-bar";

export default function Page() {
  return (
    <div className="container h-screen py-16">
      <div className="flex flex-col justify-center gap-6">
        <FilterBar />
        <SearchBar />

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Judge Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectsTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
