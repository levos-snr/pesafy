import { motion } from "framer-motion";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref as any}
        /* physics-active-state ✓  physics-subtle-deformation (0.97-1.03) ✓ */
        whileHover={disabled ? undefined : { scale: 1.03 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        /* physics-spring-for-overshoot ✓  timing-under-300ms ✓ */
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-semibold",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          "transition-colors duration-150",
          {
            "bg-primary text-primary-foreground hover:bg-primary/85 shadow-md shadow-primary/20":
              variant === "default",
            "border border-border bg-background hover:bg-muted hover:text-foreground":
              variant === "outline",
            "hover:bg-muted hover:text-foreground": variant === "ghost",
            "bg-destructive text-destructive-foreground hover:bg-destructive/85 shadow-md shadow-destructive/20":
              variant === "destructive",
            "h-8 px-3 text-sm gap-1.5": size === "sm",
            "h-10 px-4 gap-2": size === "md",
            "h-12 px-6 text-[15px] gap-2": size === "lg",
          },
          className
        )}
        {...(props as any)}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
export default Button;
