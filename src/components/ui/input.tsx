import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[34px] w-full rounded-md border border-[color:var(--border-2)] bg-card px-3 text-[14px] font-normal text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-[120ms] placeholder:text-[color:var(--text-3)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground hover:[&:not(:focus)]:border-[color:var(--border-strong)] focus:border-primary focus:shadow-[0_0_0_3px_var(--p-alpha-08)] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
