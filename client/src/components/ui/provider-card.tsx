import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ProviderCardProps {
  provider: string;
  name: string;
  description: string;
  icon: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

export function ProviderCard({
  provider,
  name,
  description,
  icon,
  selected = false,
  onClick,
}: ProviderCardProps) {
  return (
    <div
      className={cn(
        "option-card relative rounded-lg border-2 p-6 transition-all hover:scale-105 hover:shadow-lg cursor-pointer h-48 flex flex-col items-center justify-center",
        selected && "border-primary", 
        !selected && "hover:border-primary/50"
      )}
      onClick={onClick}
    >
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
      <div className="w-24 h-24 mb-4 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
