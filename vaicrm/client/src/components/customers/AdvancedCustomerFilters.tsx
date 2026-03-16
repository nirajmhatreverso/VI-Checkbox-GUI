// src/components/customers/AdvancedCustomerFilters.tsx
import { useEffect, useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { X, Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";
import { toast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

// Matches the API payload structure for filtering
export type CustomerFiltersPayload = {
  country?: string;
  region?: string;
  city?: string;
  district?: string;
  ward?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  email?: string;
  customerStage?: string;
  division?: string;
  accountClass?: string;
  salesOrg?: string;
  customerType?: string;
  customerStatus?: string;
  fromDate?: string;
  toDate?: string;
  sapBpId?: string;
  userName?: string;
};

// Type for a single row in the advanced filter UI
export type AdvancedFilter = {
  id: string;
  field: keyof CustomerFiltersPayload | "dateRange";
  value: string;
  dateRange?: DateRange;
};

interface AdvancedCustomerFiltersProps {
  advFilters: AdvancedFilter[];
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
  onFilterChange: (filters: Partial<CustomerFiltersPayload>) => void;
}

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

// Input sanitization helpers
const sanitizeAlphaOnly = (value: string) => value.replace(/[^A-Za-z\s]/g, "");
const sanitizeNumericOnly = (value: string) => value.replace(/[^0-9]/g, "");
const sanitizeAlphanumeric = (value: string) => value.replace(/[^A-Za-z0-9]/g, "");
const sanitizeAlphanumericWithSpecial = (value: string) => value.replace(/[^A-Za-z0-9@._-]/g, "");

export default function AdvancedCustomerFilters({
  advFilters,
  setAdvFilters,
  onFilterChange,
}: AdvancedCustomerFiltersProps) {
  const { data: dropdowns, isLoading: dropdownsLoading } = useOnboardingDropdowns();
  const debouncedAdvFilters = useDebouncedValue(advFilters, 500);

  const customerStatusOptions = [
    { value: "CAPTURED", name: "Captured" },
    { value: "COMPLETED", name: "Completed" },
    { value: "FAILED", name: "Failed" },
    { value: "PENDING", name: "Pending" },
    { value: "REJECTED", name: "Rejected" },
    { value: "RELEASE_TO_KYC", name: "Release to KYC" },
    { value: "RETRY", name: "Retry" },
  ];

  const FILTER_FIELD_OPTIONS = [
    { value: "firstName", label: "First Name", type: "text", inputType: "alpha", maxLength: 50 },
    { value: "lastName", label: "Last Name", type: "text", inputType: "alpha", maxLength: 50 },
    { value: "mobile", label: "Mobile", type: "text", inputType: "numeric", maxLength: 14 },
    { value: "email", label: "Email", type: "text", inputType: "email" },
    { value: "sapBpId", label: "SAP BP ID", type: "text", inputType: "alphanumeric", maxLength: 20 },
    { value: "customerStage", label: "Status", type: "select", options: customerStatusOptions },
    { value: "division", label: "Division", type: "select", options: dropdowns?.division || [] },
    { value: "accountClass", label: "Account Class", type: "select", options: dropdowns?.accountClass || [] },
    { value: "customerType", label: "Customer Type", type: "select", options: dropdowns?.customerType || [] },
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  // Get sanitizer function based on input type
  const getSanitizer = useCallback((inputType?: string) => {
    switch (inputType) {
      case "alpha":
        return sanitizeAlphaOnly;
      case "numeric":
        return sanitizeNumericOnly;
      case "email":
        return sanitizeAlphanumericWithSpecial;
      case "alphanumeric":
      default:
        return sanitizeAlphanumeric;
    }
  }, []);

  const addAdvFilter = (field: AdvancedFilter["field"]) => {
    if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
    const newFilter: AdvancedFilter = {
      id: `${field}-${Date.now()}`,
      field,
      value: "",
      dateRange: field === "dateRange" ? { from: new Date(), to: new Date() } : undefined,
    };
    setAdvFilters((prev) => [...prev, newFilter]);
  };

  const removeAdvFilter = (id: string) => {
    setAdvFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const updateAdvFilter = (id: string, newValues: Partial<AdvancedFilter>) => {
    setAdvFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...newValues } : f)));
  };

  // Handle input change with sanitization and maxLength
  const handleInputChange = (id: string, value: string, inputType?: string, maxLength?: number) => {
    const sanitizer = getSanitizer(inputType);
    let sanitizedValue = sanitizer(value);
    if (maxLength) {
      sanitizedValue = sanitizedValue.slice(0, maxLength);
    }
    updateAdvFilter(id, { value: sanitizedValue });
  };

  useEffect(() => {
    const nextFilters: Partial<CustomerFiltersPayload> = {};
    debouncedAdvFilters.forEach((f) => {
      if (f.field === "dateRange") {
        if (f.dateRange?.from) {
          nextFilters.fromDate = toYmd(f.dateRange.from);
          nextFilters.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
        }
      } else {
        (nextFilters as any)[f.field] = f.value;
      }
    });
    onFilterChange(nextFilters);
  }, [debouncedAdvFilters, onFilterChange]);

  const handleDateSelect = (range: DateRange | undefined, id: string) => {
    if (range?.from && range.to) {
      if (differenceInDays(range.to, range.from) > 15) {
        toast({
          title: "Invalid Date Range",
          description: "The selected date range cannot be more than 15 days.",
          variant: "destructive",
        });
        return;
      }
    }
    updateAdvFilter(id, { dateRange: range });
  };

  return (
    <div className="space-y-3 border p-3 rounded-md bg-gray-50">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium">Add filter</Label>
        <Select onValueChange={(v: AdvancedFilter["field"]) => addAdvFilter(v)}>
          <SelectTrigger className="h-7 text-xs w-56 bg-white">
            <SelectValue placeholder="Choose field..." />
          </SelectTrigger>
          <SelectContent>
            {FILTER_FIELD_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                disabled={advFilters.some((f) => f.field === opt.value)}
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {advFilters.length === 0 && (
          <div className="text-xs text-center text-gray-500 py-2">No advanced filters added.</div>
        )}
        {advFilters.map((af) => {
          const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field)!;
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <Select
                  value={af.field}
                  onValueChange={(v: AdvancedFilter["field"]) =>
                    updateAdvFilter(af.id, { field: v, value: "" })
                  }
                >
                  <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILTER_FIELD_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        disabled={advFilters.some((f) => f.field === opt.value && f.id !== af.id)}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-7">
                {fieldMeta.type === "text" && (
                  <Input
                    className="h-7 text-xs bg-white"
                    value={af.value}
                    maxLength={fieldMeta.maxLength}
                    onChange={(e) => handleInputChange(af.id, e.target.value, fieldMeta.inputType, fieldMeta.maxLength)}
                  />
                )}
                {fieldMeta.type === "select" && (
                  <Select
                    value={af.value}
                    onValueChange={(v) => updateAdvFilter(af.id, { value: v })}
                    disabled={dropdownsLoading && fieldMeta.value !== 'customerStage'}
                  >
                    <SelectTrigger className="h-7 text-xs bg-white"><SelectValue placeholder={`Select ${fieldMeta.label}...`} /></SelectTrigger>
                    <SelectContent>
                      {dropdownsLoading && fieldMeta.value !== 'customerStage' ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        (fieldMeta.options || []).map((opt: any) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                {fieldMeta.type === "daterange" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs bg-white">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {af.dateRange?.from ? (af.dateRange.to ? `${format(af.dateRange.from, "LLL dd, y")} - ${format(af.dateRange.to, "LLL dd, y")}` : format(af.dateRange.from, "LLL dd, y")) : (<span>Pick a range</span>)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        selected={af.dateRange}
                        onSelect={(range) => handleDateSelect(range, af.id)}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="col-span-1 text-right">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAdvFilter(af.id)}>
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}