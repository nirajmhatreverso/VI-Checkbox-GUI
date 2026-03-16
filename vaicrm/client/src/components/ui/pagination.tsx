"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";
import { ButtonProps, buttonVariants } from "@/components/ui/button";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (

<nav role="navigation" aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} /> ); Pagination.displayName = "Pagination";
const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
({ className, ...props }, ref) => <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
({ className, ...props }, ref) => <li ref={ref} className={cn("", className)} {...props} />
);
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
isActive?: boolean;
disabled?: boolean;
asChild?: boolean;
} & Pick<ButtonProps, "size"> &
(React.ComponentPropsWithoutRef<"a"> | React.ComponentPropsWithoutRef<"button">);

const PaginationLink = ({
className,
isActive,
disabled,
size = "iconSm",
asChild = false,
onClick,
...props
}: PaginationLinkProps) => {
// If consumer passed href or uses asChild, render anchor; else render button
const isAnchor = asChild || (props as any)?.href != null;
const Comp: any = asChild ? Slot : isAnchor ? "a" : "button";

const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
if (disabled) {
e.preventDefault();
e.stopPropagation();
return;
}
onClick?.(e as any);
};

const extraProps = isAnchor
? { href: (props as any).href ?? "#" }
: { type: "button" as const };

return (
<Comp
aria-current={isActive ? "page" : undefined}
aria-disabled={disabled || undefined}
tabIndex={disabled ? -1 : undefined}
onClick={handleClick}
className={cn(
buttonVariants({ variant: isActive ? "outline" : "ghost", size }),
"cursor-pointer", // ensure pointer on hover
disabled && "pointer-events-none opacity-50",
className
)}
{...extraProps}
{...props}
/>
);
};
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
<PaginationLink aria-label="Go to previous page" title="Previous page" size="xs" className={cn("gap-1 pl-2.5", className)} {...props}>
<ChevronLeft className="h-4 w-4" />
<span>Previous</span>
</PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
<PaginationLink aria-label="Go to next page" title="Next page" size="xs" className={cn("gap-1 pr-2.5", className)} {...props}>
<span>Next</span>
<ChevronRight className="h-4 w-4" />
</PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
<span aria-hidden className={cn("flex h-8 w-8 items-center justify-center", className)} {...props}>
<MoreHorizontal className="h-4 w-4" />
<span className="sr-only">More pages</span>
</span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious };