import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Extend DayPicker props with minYear / maxYear
export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  minYear?: number;
  maxYear?: number;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  month: propMonth,
  onMonthChange,
  onSelect,
  minYear = 1900, // 👈 default min year
  maxYear = 2100, // 👈 default max year
  ...props
}: CalendarProps) {
  const [month, setMonth] = React.useState<Date>(propMonth ?? new Date());

  // Sync with external prop
  React.useEffect(() => {
    if (propMonth) {
      setMonth(propMonth);
    }
  }, [propMonth]);

  const handleMonthChange = (date: Date) => {
    setMonth(date);
    onMonthChange?.(date);
  };

  const handleToday = () => {
    const today = new Date();
    onSelect?.(today);
    handleMonthChange(today);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Quick actions */}
      <div className="flex justify-between items-center px-3">
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "text-sm px-2 py-1"
          )}
          onClick={handleToday}
        >
          Today
        </button>

        <div className="flex gap-2 items-center">
          {/* Month select */}
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={month.getMonth()}
            onChange={(e) => {
              const newMonth = Number(e.target.value);
              handleMonthChange(new Date(month.getFullYear(), newMonth));
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>

          {/* Year select */}
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={month.getFullYear()}
            onChange={(e) => {
              const newYear = Number(e.target.value);
              handleMonthChange(new Date(newYear, month.getMonth()));
            }}
          >
            {Array.from(
              { length: maxYear - minYear + 1 },
              (_, i) => minYear + i
            ).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar */}
      <DayPicker
        month={month}
        onMonthChange={handleMonthChange}
        showOutsideDays={showOutsideDays}
        className={cn("p-3 rounded-md border bg-background", className)}
        classNames={{
          months:
            "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-semibold",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem] text-center",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100"
          ),
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today:
            "bg-accent text-accent-foreground border border-primary font-semibold",
          day_outside:
            "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ className }) => (
            <ChevronLeft className={cn("h-4 w-4", className)} />
          ),
          IconRight: ({ className }) => (
            <ChevronRight className={cn("h-4 w-4", className)} />
          ),
        }}
        onSelect={onSelect}
        {...props}
      />
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
