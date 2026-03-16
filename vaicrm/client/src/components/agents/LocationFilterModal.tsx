import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCountries, useRegions, useCities, useDistricts, useWards } from "@/hooks/use-center-data";
import { MapPin } from "lucide-react";
import { useAuthContext } from "@/context/AuthProvider";

export interface LocationFilters {
  country: string;
  region: string;
  city: string; // This will be the combined "CityName_cityCode" value
  district: string;
  ward: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: LocationFilters) => void;
  initialValues: LocationFilters;
}

export default function LocationFilterModal({ isOpen, onClose, onApply, initialValues }: Props) {
  const { user } = useAuthContext();
  const [country, setCountry] = useState(initialValues.country);
  const [region, setRegion] = useState(initialValues.region);
  const [city, setCity] = useState(initialValues.city);
  const [district, setDistrict] = useState(initialValues.district);
  const [ward, setWard] = useState(initialValues.ward);

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Priority: 1. Passed Value, 2. User's Country, 3. Empty
      setCountry(initialValues.country || user?.country || "");
      setRegion(initialValues.region);
      setCity(initialValues.city);
      setDistrict(initialValues.district);
      setWard(initialValues.ward);
    }
  }, [isOpen, initialValues, user]);

  const { data: countries, isLoading: countriesLoading } = useCountries();
  const { data: regions, isLoading: regionsLoading } = useRegions(country);
  const { data: cities, isLoading: citiesLoading } = useCities(country, region);
  const { data: districts, isLoading: districtsLoading } = useDistricts(country, region, city);
  const { data: wards, isLoading: wardsLoading } = useWards(country, region, city, district);

  // Auto-select if only one country is available in the API list
  useEffect(() => {
    if (countries && countries.length === 1 && !country) {
      setCountry(countries[0].country);
    }
  }, [countries, country]);

  // Auto-select if only one region is available
  useEffect(() => {
    if (regions && regions.length === 1 && !region && country) {
      setRegion(regions[0].region);
    }
  }, [regions, region, country]);

  // Auto-select if only one city is available
  useEffect(() => {
    if (cities && cities.length === 1 && !city && region) {
      setCity(cities[0].city);
    }
  }, [cities, city, region]);

  // Auto-select if only one district is available
  useEffect(() => {
    if (districts && districts.length === 1 && !district && city) {
      setDistrict(districts[0].district);
    }
  }, [districts, district, city]);

  // Auto-select if only one ward is available
  useEffect(() => {
    if (wards && wards.length === 1 && !ward && district) {
      setWard(wards[0].ward);
    }
  }, [wards, ward, district]);

  // Cascading dropdown logic
  // Note: Added check to prevent clearing if the change was just setting the default country on load
  useEffect(() => {
    if (country !== initialValues.country && country !== user?.country) {
      // Only clear children if the country change is explicit user action or different from defaults
      // (This logic is simplified; resetting on any country change is standard behavior)
      setRegion(""); setCity(""); setDistrict(""); setWard("");
    } else if (country && country !== initialValues.country) {
      // If we just set the default country, ensure children are clear unless they matched initial
      setRegion(""); setCity(""); setDistrict(""); setWard("");
    }
  }, [country]);

  useEffect(() => { if (region !== initialValues.region) { setCity(""); setDistrict(""); setWard(""); } }, [region]);
  useEffect(() => { if (city !== initialValues.city) { setDistrict(""); setWard(""); } }, [city]);
  useEffect(() => { if (district !== initialValues.district) { setWard(""); } }, [district]);

  const handleApply = () => {
    onApply({ country, region, city, district, ward });
    onClose();
  };

  const handleClear = () => {
    // If user clears, we can reset to empty, or reset to default country. 
    // Usually "Clear" implies empty, but business rules might require country.
    // Keeping it empty allows user to see they cleared it, but the Pre-select logic 
    // will kick in again next time they open the modal.
    setCountry("");
    setRegion("");
    setCity("");
    setDistrict("");
    setWard("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-azam-blue" /> Filter by Location</DialogTitle>
          <DialogDescription>Select location criteria to narrow down the agent list. Fields are optional.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div>
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry} disabled={countriesLoading}>
              <SelectTrigger uiSize="sm"><SelectValue placeholder="Select Country" /></SelectTrigger>
              <SelectContent>
                {countries?.map((c: any) => <SelectItem key={c.country} value={c.country}>{c.country}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Region</Label>
            <Select value={region} onValueChange={setRegion} disabled={!country || regionsLoading}>
              <SelectTrigger uiSize="sm"><SelectValue placeholder="Select Region" /></SelectTrigger>
              <SelectContent>
                {regions?.map((r: any) => <SelectItem key={r.region} value={r.region}>{r.region}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>City</Label>
            <Select value={city} onValueChange={setCity} disabled={!region || citiesLoading}>
              <SelectTrigger uiSize="sm"><SelectValue placeholder="Select City" /></SelectTrigger>
              <SelectContent>
                {cities?.map((c: any) => <SelectItem key={`${c.city}_${c.cityCode}`} value={c.city}>{c.city}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>District</Label>
            <Select value={district} onValueChange={setDistrict} disabled={!city || districtsLoading}>
              <SelectTrigger uiSize="sm"><SelectValue placeholder="Select District" /></SelectTrigger>
              <SelectContent>
                {districts?.map((d: any) => <SelectItem key={d.district} value={d.district}>{d.district}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Ward</Label>
            <Select value={ward} onValueChange={setWard} disabled={!district || wardsLoading}>
              <SelectTrigger uiSize="sm"><SelectValue placeholder="Select Ward" /></SelectTrigger>
              <SelectContent>
                {wards?.map((w: any) => <SelectItem key={w.ward} value={w.ward}>{w.ward}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" size="xs" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" size="xs" variant="ghost" onClick={handleClear}>Clear Filters</Button>
          <Button type="button" size="xs" onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}