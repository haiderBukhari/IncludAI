import { cn } from "@/lib/utils";

export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === current ? "w-6 bg-ink" : "w-1.5 bg-line"
          )}
        />
      ))}
    </div>
  );
}
