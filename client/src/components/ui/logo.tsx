import { SVGProps } from "react";
import { cn } from "@/lib/utils";

export interface LogoProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

export function Logo({ className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      {...props}
    >
      <path
        d="M24 40C24 29.6053 32.6053 21 43 21C53.3947 21 62 29.6053 62 40C62 50.3947 53.3947 59 43 59C32.6053 59 24 50.3947 24 40Z"
        fill="url(#paint0_linear)"
      />
      <path
        d="M16 40C16 23.4315 29.4315 10 46 10C62.5685 10 76 23.4315 76 40L46 40C46 40 16 40 16 40Z"
        fill="#3DB3E3"
      />
      <path
        d="M62 40C62 56.5685 48.5685 70 32 70C15.4315 70 2 56.5685 2 40L32 40C32 40 62 40 62 40Z"
        fill="#E865A0"
      />
      <defs>
        <linearGradient
          id="paint0_linear"
          x1="24"
          y1="40"
          x2="62"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3DB3E3" />
          <stop offset="0.5" stopColor="#6866C1" />
          <stop offset="1" stopColor="#E865A0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
