import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-[color:var(--border-2)] bg-card px-3 py-2 text-[14px] text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-[120ms] placeholder:text-[color:var(--text-3)] hover:[&:not(:focus)]:border-[color:var(--border-strong)] focus:border-primary focus:shadow-[0_0_0_3px_var(--p-alpha-08)] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
