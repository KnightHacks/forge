import { Separator } from "@forge/ui/separator";

export default function SettingsProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Member Profile</h3>
        <p className="text-sm text-muted-foreground">
          This is your member profile. Make changes to your account here.
        </p>
      </div>
      <Separator />
    </div>
  );
}
