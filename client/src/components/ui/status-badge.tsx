import { cn } from "@/lib/utils";
import { ResourceStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: ResourceStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Define status styles
  const statusStyles = {
    running: "bg-green-100 text-green-800",
    stopped: "bg-red-100 text-red-800",
    terminated: "bg-gray-100 text-gray-800",
    available: "bg-green-100 text-green-800",
    unavailable: "bg-red-100 text-red-800",
    active: "bg-blue-100 text-blue-800",
  };

  // Get style for current status or default to muted
  const style = statusStyles[status] || "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "px-2 py-1 rounded-full text-xs font-medium",
        style,
        className
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
