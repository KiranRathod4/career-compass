import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none rounded-md text-[13px] font-medium cursor-pointer border border-transparent outline-none transition-[background-color,border-color,color,transform,box-shadow] duration-[120ms] ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-[color:var(--p-7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.2)] hover:bg-[var(--p-5)] active:bg-[var(--p-7)]",
        primary:
          "bg-primary text-primary-foreground border-[color:var(--p-7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.2)] hover:bg-[var(--p-5)] active:bg-[var(--p-7)]",
        secondary:
          "bg-card text-foreground border-[color:var(--border-2)] shadow-sm hover:bg-secondary hover:border-[color:var(--border-strong)]",
        outline:
          "bg-card text-foreground border-[color:var(--border-2)] shadow-sm hover:bg-secondary hover:border-[color:var(--border-strong)]",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        destructive:
          "bg-transparent text-destructive hover:bg-[var(--r-alpha-10)]",
        link:
          "text-primary underline-offset-4 hover:underline border-transparent",
      },
      size: {
        default: "h-[34px] px-[14px] text-[13px]",
        sm: "h-7 px-[10px] text-[12px]",
        md: "h-[34px] px-[14px] text-[13px]",
        lg: "h-10 px-[18px] text-[14px]",
        icon: "h-[34px] w-[34px] p-0",
        "icon-sm": "h-7 w-7 p-0",
        "icon-lg": "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), loading && "pointer-events-none opacity-70")}
        ref={ref}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-r-transparent animate-spin" />
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
