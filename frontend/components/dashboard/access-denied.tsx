import { Card } from "@/components/ui";

export function AccessDenied({ department = "dashboard" }: Readonly<{ department?: string }>) {
  return (
    <Card className="rounded-2xl border-amber-100 bg-amber-50 p-5 text-amber-800">
      <h2 className="text-lg font-semibold">Access restricted</h2>
      <p className="mt-1 text-sm">
        Your login does not have access to the {department} module. Please use an approved full-access email or contact the manager.
      </p>
    </Card>
  );
}
