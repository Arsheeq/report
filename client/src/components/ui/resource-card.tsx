import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ResourceStatus } from "@shared/schema";

interface ResourceCardProps {
  id: number;
  name: string;
  resourceId: string;
  type: string;
  region: string;
  status: ResourceStatus;
  selected?: boolean;
  onClick?: () => void;
}

export function ResourceCard({
  id,
  name,
  resourceId,
  type,
  region,
  status,
  selected = false,
  onClick,
}: ResourceCardProps) {
  return (
    <Card
      className={cn(
        "relative rounded-lg border-2 transition-all hover:scale-105 hover:shadow-lg cursor-pointer",
        selected ? "border-primary" : "border-border"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {selected && (
          <div className="absolute top-3 right-3">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
        )}

        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{name}</h3>
            <span className="text-sm text-muted-foreground">{resourceId}</span>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-4 space-y-1">
          <div className="text-sm">
            <span className="text-muted-foreground mr-2">Type:</span>
            {type}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground mr-2">Region:</span>
            {region}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
