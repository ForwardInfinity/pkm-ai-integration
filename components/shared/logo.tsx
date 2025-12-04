import { cn } from "@/lib/utils";
import Link from "next/link";

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  linkToHome?: boolean;
}

export function Logo({ className, showTagline = false, linkToHome = true }: LogoProps) {
  const content = (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="flex items-center gap-2">
        {/* Minimal geometric mark - nested squares representing layers of refinement */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          aria-hidden="true"
        >
          {/* Outer layer */}
          <rect
            x="2"
            y="2"
            width="20"
            height="20"
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.35"
          />
          {/* Middle layer */}
          <rect
            x="6"
            y="6"
            width="12"
            height="12"
            rx="0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.6"
          />
          {/* Core - the refined essence */}
          <rect
            x="9.5"
            y="9.5"
            width="5"
            height="5"
            rx="0.25"
            fill="currentColor"
          />
        </svg>
        <span className="text-lg font-medium">
          Refinery
        </span>
      </div>
      {showTagline && (
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          A selection environment for ideas
        </p>
      )}
    </div>
  );

  if (linkToHome) {
    return (
      <Link 
        href="/" 
        className="transition-opacity duration-150 hover:opacity-60"
      >
        {content}
      </Link>
    );
  }

  return content;
}

