import { env } from "~/env";
import { TeamCascadeClient } from "./TeamCascadeClient";

interface TeamCascadeProps {
  className?: string;
}

export function TeamCascade({ className }: TeamCascadeProps) {
  return <TeamCascadeClient bladeUrl={env.BLADE_URL} className={className} />;
}
