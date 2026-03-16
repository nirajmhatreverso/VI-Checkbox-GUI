import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, UserCheck, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCountries, useRegions, useCities } from "@/hooks/use-center-data";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { agentApi } from "@/lib/agentApi"; 
import { useAuthContext } from "@/context/AuthProvider";

// 1. Updated Type to include macId
type FilterMode = "mobile" | "sapBpId" | "location" | "name" | "macId";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sapBpId: string) => void;
}

interface CustomerApiItem {
  name: string;
  country: string;
  region: string;
  city: string;
  district: string;
  ward: string;
  sapBpId: string;
  sapCaId: string;
}

function extractCityName(combined?: string) {
  if (!combined) return "";
  const [name] = String(combined).split("_");
  return name || combined;
}

export default function CustomerSearchModal({ isOpen, onClose, onSelect }: Props) {
  const { user } = useAuthContext();
  const [mode, setMode] = useState<FilterMode>("mobile");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CustomerApiItem[]>([]);

  // Filter fields
  const [mobile, setMobile] = useState("");
  const [sapBpId, setSapBpId] = useState("");
  const [name, setName] = useState("");
  const [macId, setMacId] = useState(""); // 2. New State for MAC ID

  // Location fields
  const [country, setCountry] = useState(user?.country || "");
  const [region, setRegion] = useState("");
  const [cityCombined, setCityCombined] = useState("");

  const controlClasses = "h-8 text-xs";
  const { toast } = useToast();

  // Center dropdown hooks
  const { data: countries } = useCountries();
  const { data: regions, isLoading: regionsLoading } = useRegions(country);
  const { data: cities, isLoading: citiesLoading } = useCities(country, region);

  useEffect(() => {
    if (isOpen) {
      setCountry(user?.country || "");
      setResults([]);
      setMobile("");
      setSapBpId("");
      setName("");
      setMacId(""); // 3. Reset MAC ID on open
    }
  }, [isOpen, user]);

  const fetchCustomers = async () => {
    // 4. Update Validation Logic
    const isIdProvided = 
      (mode === "mobile" && mobile.trim()) || 
      (mode === "sapBpId" && sapBpId.trim()) || 
      (mode === "name" && name.trim()) ||
      (mode === "macId" && macId.trim());
      
    const isLocationProvided = mode === "location" && region && cityCombined;

    if (!isIdProvided && !isLocationProvided) {
      toast({ title: "Validation Error", description: "Please provide valid search criteria.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const payload: any = {
        type: "Customer",      
        isSubCollection: "Y", 
        salesOrg: user?.salesOrg,
      };

      // 5. Update Payload Logic
      if (mode === "mobile") {
        payload.mobile = mobile.trim();
      }
      else if (mode === "sapBpId") {
        payload.sapBpId = sapBpId.trim();
      }
      else if (mode === "location") {
        payload.region = region;
        payload.city = extractCityName(cityCombined);
        if (country) payload.country = country;
      }
      else if (mode === "name") {
        payload.firstName = name.trim();
      }
      else if (mode === "macId") {
        payload.macId = macId.trim();
      }

      // Calling crm/v1/userDetailsByType via agentApi
      const res: any = await agentApi.searchUserDetails(payload);

      if (res.status !== "SUCCESS" || !res.data?.customerDetails) {
        throw new Error(res.statusMessage || "No records found");
      }

      const mappedResults: CustomerApiItem[] = res.data.customerDetails.map((item: any) => {
        const billingAddress = item.contactMedium?.find((c: any) => c.type === "BILLING_ADDRESS") || {};

        const relatedParties = item.relatedParty || [];
        const bpId = relatedParties.find((r: any) => r.sapBpId)?.sapBpId
          || item.sapBpId
          || "N/A";

        const caId = relatedParties.find((r: any) => r.sapCaId)?.sapCaId || "";

        return {
          name: `${item.firstName || ""} ${item.lastName || ""}`.trim(),
          sapBpId: bpId,
          sapCaId: caId,
          country: billingAddress.country || "",
          region: billingAddress.region || "",
          city: billingAddress.city || "",
          district: billingAddress.district || "",
          ward: billingAddress.ward || "",
        };
      });

      const validCustomers = mappedResults.filter(c => c.sapBpId !== "N/A");
      setResults(validCustomers);

      if (validCustomers.length === 0) {
        toast({ title: "No Results", description: "No customers found with the specified criteria." });
      }

    } catch (err: any) {
      toast({ title: "Search Failed", description: err.message || "No customers found", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-2xl rounded-lg">
        <DialogHeader>
          <DialogTitle><Badge variant="outline" className="bg-blue-50 text-blue-700">Customer Search</Badge></DialogTitle>
          <DialogDescription>Search to assign a Parent Customer (from {user?.salesOrg || "Sales Org"}).</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as FilterMode)} className="w-full">
          {/* 6. Updated Grid Cols to 5 to accommodate new tab */}
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="name">Name</TabsTrigger>
            <TabsTrigger value="mobile">Mobile</TabsTrigger>
            <TabsTrigger value="sapBpId">BP ID</TabsTrigger>
            <TabsTrigger value="macId">SmartCard</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
          </TabsList>

          <TabsContent value="mobile">
  <Label>Mobile Number</Label>
  <Input 
    placeholder="Enter mobile..." 
    value={mobile} 
    maxLength={14}
    onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, "").slice(0, 14))} 
    className={controlClasses} 
  />
</TabsContent>

          <TabsContent value="sapBpId">
  <Label>SAP BP ID</Label>
  <Input 
    placeholder="Enter BP ID..." 
    value={sapBpId} 
    maxLength={20}
    onChange={(e) => setSapBpId(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20))} 
    className={controlClasses} 
  />
</TabsContent>

          {/* 7. New Tab Content for MAC ID */}
          <TabsContent value="macId">
  <Label>MAC ID / STB ID</Label>
  <Input 
    placeholder="Enter MAC ID or Serial Number..." 
    value={macId} 
    maxLength={20}
    onChange={(e) => setMacId(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20))} 
    className={controlClasses} 
  />
</TabsContent>

          <TabsContent value="location">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className={controlClasses}><SelectValue placeholder="Select Country" /></SelectTrigger>
                  <SelectContent>{(countries || []).map((c: any) => <SelectItem key={c.country} value={c.country}>{c.country}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Region <span className="text-red-500">*</span></Label>
                <Select value={region} onValueChange={setRegion} disabled={!country || regionsLoading}>
                  <SelectTrigger className={controlClasses}><SelectValue placeholder="Select Region" /></SelectTrigger>
                  <SelectContent>{(regions || []).map((r: any) => <SelectItem key={r.region} value={r.region}>{r.region}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>City <span className="text-red-500">*</span></Label>
                <Select value={cityCombined} onValueChange={setCityCombined} disabled={!region || citiesLoading}>
                  <SelectTrigger className={controlClasses}><SelectValue placeholder="Select City" /></SelectTrigger>
                  <SelectContent>{(cities || []).map((city: any) => <SelectItem key={`${city.city}_${city.cityCode}`} value={`${city.city}_${city.cityCode}`}>{city.city}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="name">
  <Label>Customer Name</Label>
  <Input 
    placeholder="Enter name..." 
    value={name} 
    maxLength={50}
    onChange={(e) => setName(e.target.value.replace(/[^A-Za-z\s]/g, "").slice(0, 50))} 
    className={controlClasses} 
  />
</TabsContent>
        </Tabs>

        <Button className="w-full mt-2 h-8 text-xs bg-azam-blue hover:bg-blue-700" onClick={fetchCustomers} disabled={loading}>
          {loading ? <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Searching...</> : <><Search className="h-3 w-3 mr-2" /> Find Customer</>}
        </Button>

        <div className="mt-4 max-h-[40vh] overflow-auto border rounded-md bg-gray-50">
          {results.length === 0 && !loading && <div className="p-4 text-center text-xs text-gray-500">No records found.</div>}

          {results.map((row, index) => (
            <div
              key={`${row.sapBpId}-${index}`}
              className="px-4 py-3 border-b bg-white cursor-pointer hover:bg-blue-50 flex justify-between items-start group"
              onClick={() => { onSelect(row.sapBpId); onClose(); }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">{row.name}</span>
                  {row.sapCaId && <Badge variant="secondary" className="text-[10px] h-4 px-1 text-gray-500">CA: {row.sapCaId}</Badge>}
                </div>

                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
                  <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200">BP: {row.sapBpId}</Badge>

                  <div className="flex items-center gap-1 text-gray-400">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {[row.ward, row.district, row.city, row.region].filter(Boolean).join(", ")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pl-2 self-center">
                <UserCheck className="h-4 w-4 text-gray-300 group-hover:text-green-600" />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}