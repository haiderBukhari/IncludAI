import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-paper-raised border border-line rounded-[1.25rem] shadow-[var(--shadow-soft)]",
        className
      )}
      {...props}
    />
  );
}
