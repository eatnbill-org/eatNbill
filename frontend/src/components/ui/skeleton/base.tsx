import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "full";
}

const roundedMap: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

const SkeletonComponent = ({ className, rounded = "md", ...props }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "skeleton-shimmer relative overflow-hidden bg-muted/70",
        roundedMap[rounded],
        className
      )}
      {...props}
    />
  );
};

export const Skeleton = React.memo(SkeletonComponent);
Skeleton.displayName = "Skeleton";
