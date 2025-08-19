import { cn } from "@/lib/utils";
import * as React from "react";

interface BoardWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function BoardWrapper({ children, className }: BoardWrapperProps) {
  return (
    <div
      className={cn(
        "w-full h-full columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4 md:gap-4 p-3 md:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}