import * as React from "react";
import { cn } from "@/lib/utils";

type NativeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">;

type UISize = "sm" | "md" | "lg";

type InputProps = NativeInputProps & {
uiSize?: UISize;
invalid?: boolean;
leftIcon?: React.ReactNode;
rightIcon?: React.ReactNode;
containerClassName?: string; // wrapper div classes
};

const sizeClasses: Record<UISize, string> = {
sm: "h-7 text-xs",
md: "h-9 text-sm",
lg: "h-11 text-base",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
(
{
className,
containerClassName,
type = "text",
uiSize = "sm",
invalid,
leftIcon,
rightIcon,
...props
},
ref
) => {
const hasLeft = !!leftIcon;
const hasRight = !!rightIcon;
return (
  <div className={cn("relative w-full", containerClassName)}>
    {hasLeft && (
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
        {leftIcon}
      </span>
    )}
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex w-full min-w-0 rounded-md border bg-background ring-offset-background",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azam-orange focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // your base styles kept from the original
        "border-azam-blue px-3 py-2 md:text-sm",
        sizeClasses[uiSize],
        hasLeft && "pl-8",
        hasRight && "pr-8",
        invalid && "border-red-500 focus-visible:ring-red-500",
        className
      )}
      {...props}
    />
    {hasRight && (
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
        {rightIcon}
      </span>
    )}
  </div>
);
}
);

Input.displayName = "Input";

export { Input };