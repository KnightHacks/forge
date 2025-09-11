import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daniel Schevis - Dev Team Application",
  description: "Software Developer and Knight Hacks Team Member Applicant",
};

export default function DanielSchevisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
