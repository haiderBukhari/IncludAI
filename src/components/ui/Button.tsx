import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-ink text-paper hover:bg-ink/90 active:bg-ink/80 shadow-[0_1px_2px_rgba(42,38,34,0.08)]",
  secondary:
    "bg-paper-raised text-ink border border-line hover:border-ink-faint",
  ghost: "text-ink-soft hover:text-ink hover:bg-black/[0.03]",
};

const sizeClasses: Record<Size, string> = {
  md: "text-[0.9375rem] px-5 py-2.5 rounded-[0.875rem]",
  lg: "text-base px-7 py-4 rounded-[1.25rem]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
