import { cn } from "@/lib/utils";

export interface NubinixLogoProps {
  className?: string;
  height?: number;
  width?: number;
}

export function NubinixLogo({ className, height = 40, width = 150 }: NubinixLogoProps) {
  return (
    <img 
      src="/nubinix_logo.jpg" 
      alt="Nubinix Logo" 
      className={cn("h-auto", className)} 
      style={{ height: height, width: 'auto' }}
    />
  );
}