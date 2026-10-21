import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background,color,box-shadow,transform,border-color] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-[1.05em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-ink shadow-sm hover:bg-primary-hover",
        secondary: "border border-line-strong bg-surface text-ink shadow-sm hover:border-ink-3 hover:bg-surface-2",
        soft: "bg-primary-soft text-primary-soft-ink hover:brightness-[0.97]",
        ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
        danger: "bg-danger text-white shadow-sm hover:brightness-110 dark:text-bg",
        "danger-soft": "bg-danger-soft text-danger hover:brightness-[0.97]",
        link: "h-auto p-0 text-primary underline-offset-4 hover:underline",
        clay: "bg-clay text-white shadow-sm hover:brightness-105 dark:text-bg",
      },
      size: {
        sm: "h-8 rounded-lg px-3 text-[13px]",
        md: "h-10 rounded-xl px-4 text-sm",
        lg: "h-12 rounded-2xl px-6 text-[15px]",
        icon: "size-9 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}
