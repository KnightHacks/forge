import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DANIEL_SCHEVIS.exe - Cybernetic Developer",
  description: "Knight Hacks Team Member Applicant | Neural Interface Active",
};

export default function DanielSchevisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      {children}
    </div>
  );
}
