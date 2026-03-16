"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 gap-2",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-3 min-w-10",
        sm: "h-9 px-2.5 min-w-9",
        lg: "h-11 px-5 min-w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ToggleBaseProps = React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>;
type ToggleVariants = VariantProps<typeof toggleVariants>;

export interface ToggleProps extends ToggleBaseProps, ToggleVariants {
  onIcon?: React.ReactNode;
  offIcon?: React.ReactNode;
  iconPosition?: "start" | "end";
  label?: React.ReactNode; // optional label; if children provided, children take precedence
}

const Toggle = React.forwardRef<React.ElementRef<typeof TogglePrimitive.Root>, ToggleProps>(
  (
    {
      className,
      variant,
      size,
      onIcon,
      offIcon,
      iconPosition = "start",
      label,
      pressed,           // controlled mode
      defaultPressed,    // uncontrolled mode
      onPressedChange,
      children,          // now supported
      ...props
    },
    ref
  ) => {
    const isControlled = pressed !== undefined;
    const [internalPressed, setInternalPressed] = React.useState<boolean>(!!defaultPressed);

    const isOn = isControlled ? !!pressed : internalPressed;

    const handlePressedChange = (v: boolean) => {
      if (!isControlled) setInternalPressed(v);
      onPressedChange?.(v);
    };

    const iconNode = isOn ? (onIcon ?? <Check />) : (offIcon ?? <X />);

    return (
      <TogglePrimitive.Root
        ref={ref}
        className={cn(toggleVariants({ variant, size, className }))}
        pressed={pressed}
        defaultPressed={defaultPressed}
        onPressedChange={handlePressedChange}
        {...props}
      >
        {iconPosition === "start" && iconNode}
        {children ?? (label ? <span className="text-sm">{label}</span> : null)}
        {iconPosition === "end" && iconNode}
      </TogglePrimitive.Root>
    );
  }
);

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };