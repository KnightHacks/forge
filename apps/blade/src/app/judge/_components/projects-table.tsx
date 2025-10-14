"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";

import { RubricForm } from "./rubric-form";

const mockData = [
  {
    id: "1",
    projectName: "wow",
    devpost: "https://devpost.com/software/overcharged",
    description: "does cool things",
    judge: "fernando",
    judgeId: "judge-1",
  },
  {
    id: "2",
    projectName: "cool",
    devpost: "https://devpost.com/software/lazyfood",
    description: "also does cool things",
    judge: "ailon",
    judgeId: "judge-2",
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
          <TableHead className="text-center">Evaluation</TableHead>
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
            <TableCell className="text-center">
              <RubricForm
                submissionId={project.id}
                judgeId={project.judgeId}
                projectName={project.projectName}
                size="sm"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
