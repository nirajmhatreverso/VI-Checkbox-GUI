// src/components/agents/SalesOrgDropdown.tsx
import { useMemo, useEffect } from "react";
import { Controller, type Control, type FieldErrors, type Path, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";

type SalesOrgOption = {
  value: string;
  name: string;
  country?: string; 
};

type FieldNames<T> = Path<T>;

interface SalesOrgDropdownProps<T extends Record<string, any>> {
  control: Control<T>;
  watch: UseFormWatch<T>;
  setValue: UseFormSetValue<T>;
  errors: FieldErrors<T>;
  fieldName?: FieldNames<T>;        
  countryFieldName?: FieldNames<T>; 
  isDisabled?: boolean;
}

export default function SalesOrgDropdown<T extends Record<string, any>>({
  control,
  watch,
  setValue,
  errors,
  fieldName = "salesOrg" as FieldNames<T>,
  countryFieldName = "country" as FieldNames<T>,
  isDisabled, 
}: SalesOrgDropdownProps<T>) {
  const { data: dropdowns, isLoading } = useOnboardingDropdowns();

  const selectedCountry = (watch(countryFieldName) as unknown) as string | undefined;
  const currentSalesOrg = (watch(fieldName) as unknown) as string | undefined;

  const salesOrgOptions: SalesOrgOption[] = useMemo(() => {
    return (dropdowns?.salesOrg as SalesOrgOption[]) || [];
  }, [dropdowns]);

  const filteredSalesOrg: SalesOrgOption[] = useMemo(() => {
    // FIX: If disabled (Edit Mode), return ALL options. 
    // This ensures the Select can find the label for the current value, 
    // even if the country filter logic has a data mismatch or timing issue.
    if (isDisabled) return salesOrgOptions;

    if (!selectedCountry) return salesOrgOptions;
    return salesOrgOptions.filter((org) => org.country === selectedCountry);
  }, [salesOrgOptions, selectedCountry, isDisabled]);

  // Auto-select if only one option (Only when NOT disabled)
  useEffect(() => {
    if (filteredSalesOrg.length === 1 && !isDisabled) {
      setValue(fieldName, filteredSalesOrg[0].value as any, { shouldValidate: true });
    }
  }, [filteredSalesOrg, setValue, fieldName, isDisabled]);

  // Prevent clearing the value in Edit Mode
  useEffect(() => {
    if (
      currentSalesOrg &&
      !filteredSalesOrg.some((org) => org.value === currentSalesOrg) && 
      !isDisabled 
    ) {
      setValue(fieldName, "" as any, { shouldValidate: true });
    }
  }, [filteredSalesOrg, currentSalesOrg, setValue, fieldName, isDisabled]);

  const hasError = !!(errors as Record<string, any>)[fieldName as string];
  const errorMessage = (errors as Record<string, any>)[fieldName as string]?.message as string | undefined;

  return (
    <Controller
      name={fieldName}
      control={control}
      render={({ field }) => (
        <div>
          <Label htmlFor="salesOrg">Sales Organization <span className="text-red-500">*</span></Label>
          <Select
            value={field.value || ""}
            onValueChange={(val) => field.onChange(val)}
            // Ensure we disable if prop is passed OR if loading OR if list is empty
            disabled={isDisabled || isLoading || filteredSalesOrg.length === 0}
          >
            <SelectTrigger uiSize="sm" className="mt-1" aria-invalid={hasError || undefined}>
              <SelectValue placeholder={isLoading ? "Loading..." : "Select Sales Org"} />
            </SelectTrigger>
            <SelectContent>
              {isLoading && (
                <SelectItem value="loading" disabled>
                  Loading...
                </SelectItem>
              )}
              {!isLoading && filteredSalesOrg.length === 0 && (
                <SelectItem value="empty" disabled>
                  {selectedCountry ? "No Sales Org available" : "Select country first"}
                </SelectItem>
              )}
              {filteredSalesOrg.map((org) => (
                <SelectItem key={org.value} value={org.value}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasError && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
        </div>
      )}
    />
  );
}