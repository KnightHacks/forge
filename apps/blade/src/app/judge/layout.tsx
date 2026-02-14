import { JudgeNavigation } from "~/app/_components/judge/judge-navigation";

export default function JudgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Judge Navigation */}
        <JudgeNavigation />

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
