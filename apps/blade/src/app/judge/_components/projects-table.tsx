"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";

const mockData = [
  {
    projectName: "wow",
    devpost: "https://devpost.com/software/overcharged",
    description: "does cool things",
    judge: "fernando",
  },
  {
    projectName: "cool",
    devpost: "https://devpost.com/software/lazyfood",
    description: "also does cool things",
    judge: "ailon",
  },
];

export function ProjectsTable({ data = mockData }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[150px]">Project Name</TableHead>
          <TableHead>Devpost</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Judge</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((project, idx) => (
          <TableRow key={idx}>
            <TableCell className="font-medium">{project.projectName}</TableCell>
            <TableCell>
              <a
                href={project.devpost}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                Devpost
              </a>
            </TableCell>
            <TableCell>{project.description}</TableCell>
            <TableCell className="text-right">{project.judge}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}