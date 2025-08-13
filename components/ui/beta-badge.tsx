import * as React from "react";

interface BetaBadgeProps {
  className?: string;
}

export function BetaBadge({ className }: BetaBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-500 dark:bg-blue-900/50 ${className || ""}`}
    >
      Beta
    </span>
  );
}
