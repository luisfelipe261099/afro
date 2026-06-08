import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tom: {
        ocre: "bg-ocre/20 text-ocre",
        ouro: "bg-dourado/20 text-dourado",
        terracota: "bg-primary/20 text-primary",
        folha: "bg-accent/25 text-accent-foreground",
        muted: "bg-muted text-muted-foreground",
        destructive: "bg-destructive/20 text-destructive",
      },
    },
    defaultVariants: { tom: "muted" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tom, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tom }), className)} {...props} />;
}
