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

type FilterMode = "mobile" | "onbId" | "location" | "name";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (agent: AgentApiItem) => void;
    isSubCollection?: "Y" | "N";
}

export interface AgentApiItem {
    agentName: string;
    country: string;
    region: string;
    city: string;
    district: string;
    ward: string;
    sapBpId: string;
    sapCaId: string;
    currency: string;
    salesOrg?: string;
}

function extractCityName(combined?: string) {
    if (!combined) return "";
    const [name] = String(combined).split("_");
    return name || combined;
}

export default function SubagentSearchModal({
    isOpen,
    onClose,
    onSelect,
    isSubCollection = "N" // Default to "N" (Hardware mode)
}: Props) {
    const { user } = useAuthContext();
    const [mode, setMode] = useState<FilterMode>("mobile");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<AgentApiItem[]>([]);

    const [mobile, setMobile] = useState("");
    const [onbId, setOnbId] = useState("");
    const [name, setName] = useState("");

    // Location fields
    const [country, setCountry] = useState(user?.country || "");
    const [region, setRegion] = useState("");
    const [cityCombined, setCityCombined] = useState("");

    const controlClasses = "h-8 text-xs";
    const { toast } = useToast();

    const { data: countries } = useCountries();
    const { data: regions, isLoading: regionsLoading } = useRegions(country);
    const { data: cities, isLoading: citiesLoading } = useCities(country, region);

    useEffect(() => {
        if (isOpen) {
            setCountry(user?.country || "");
            setResults([]);
            setMobile("");
            setOnbId("");
            setName("");
            setRegion("");
            setCityCombined("");
        }
    }, [isOpen, user]);

    const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, "").slice(0, 14);
        setMobile(value);
    };

    const handleOnbIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
        setOnbId(value);
    };

    const fetchAgents = async () => {
        const isIdProvided = (mode === "mobile" && mobile.trim()) || (mode === "onbId" && onbId.trim()) || (mode === "name" && name.trim());
        const isLocationProvided = mode === "location" && region && cityCombined;

        if (!isIdProvided && !isLocationProvided) {
            toast({ title: "Validation Error", description: "Please provide valid search criteria.", variant: "destructive" });
            return;
        }

        setLoading(true);
        setResults([]);

        try {
            const payload = {
                name: mode === "name" ? name.trim() : "",
                mobile: mode === "mobile" ? mobile.trim() : "",
                onbId: mode === "onbId" ? onbId.trim() : "",
                country: mode === "location" ? (country || "") : "",
                city: mode === "location" ? extractCityName(cityCombined) : "",
                region: mode === "location" ? region : ""
            };

            const res: any = await agentApi.subAgentSearch(payload);

            if (res.status !== "SUCCESS" || !res.data) {
                throw new Error(res.statusMessage || "No records found");
            }

            // Handle potential different response structures
            const agentsData = res.data.subAgentDetails || res.data.customerDetails || res.data.agents || (Array.isArray(res.data) ? res.data : []);

            if (agentsData.length === 0) {
                throw new Error("No records found");
            }

            const mappedResults: AgentApiItem[] = agentsData.map((item: any) => {
                const billingAddress = item.contactMedium?.find((c: any) => c.type === "BILLING_ADDRESS") || {};
                const relatedParties = item.relatedParty || [];
                const bpId = item.onbId
                    || relatedParties.find((r: any) => r.sapBpId)?.sapBpId
                    || item.sapBpId
                    || "N/A";

                const caId = relatedParties.find((r: any) => r.sapCaId)?.sapCaId || "";

                return {
                    agentName: item.name || `${item.firstName || ""} ${item.lastName || ""}`.trim(),
                    sapBpId: bpId,
                    sapCaId: caId,
                    country: item.country || billingAddress.country || "",
                    region: item.region || billingAddress.region || "",
                    city: item.city || billingAddress.city || "",
                    district: item.district || billingAddress.district || "",
                    ward: item.ward || billingAddress.ward || "",
                    currency: item.currency || relatedParties.find((r: any) => r.currency)?.currency || "",
                    salesOrg: item.salesOrg || relatedParties.find((r: any) => r.salesOrg)?.salesOrg || user?.salesOrg || "",
                };
            });

            setResults(mappedResults);

        } catch (err: any) {
            toast({ title: "Search Failed", description: err.message || "No sub-agents found", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:max-w-2xl rounded-lg">
                <DialogHeader>
                    <DialogTitle><Badge variant="outline" className="bg-blue-50 text-blue-700">Sub-agent Search</Badge></DialogTitle>
                    <DialogDescription>Select and assign ONB ID as Sub-agent</DialogDescription>
                </DialogHeader>

                <Tabs value={mode} onValueChange={(v) => setMode(v as FilterMode)} className="w-full">
                    <TabsList className="grid grid-cols-4 mb-4">
                        <TabsTrigger value="name">Name</TabsTrigger>
                        <TabsTrigger value="mobile">Mobile</TabsTrigger>
                        <TabsTrigger value="onbId">ONB ID</TabsTrigger>
                        <TabsTrigger value="location">Location</TabsTrigger>
                    </TabsList>

                    <TabsContent value="mobile">
                        <Label>Mobile Number</Label>
                        <Input placeholder="Enter mobile..." value={mobile} onChange={handleMobileChange} className={controlClasses} />
                    </TabsContent>

                    <TabsContent value="onbId">
                        <Label>ONB ID</Label>
                        <Input placeholder="Enter ONB ID..." value={onbId} onChange={handleOnbIdChange} className={controlClasses} />
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
                        <Label>Sub-agent Name</Label>
                        <Input placeholder="Enter name..." value={name} onChange={(e) => setName(e.target.value)} className={controlClasses} />
                    </TabsContent>
                </Tabs>

                <Button className="w-full mt-2 h-8 text-xs bg-azam-blue hover:bg-blue-700" onClick={fetchAgents} disabled={loading}>
                    {loading ? <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Searching...</> : <><Search className="h-3 w-3 mr-2" /> Find Sub-agent</>}
                </Button>

                <div className="mt-4 max-h-[40vh] overflow-auto border rounded-md bg-gray-50">
                    {results.length === 0 && !loading && <div className="p-4 text-center text-xs text-gray-500">No records found.</div>}

                    {results.map((row, index) => (
                        <div
                            key={`${row.sapBpId}-${index}`}
                            className="px-4 py-3 border-b bg-white cursor-pointer hover:bg-blue-50 flex justify-between items-start group"
                            onClick={() => { onSelect(row); onClose(); }}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-800">{row.agentName}</span>
                                    {row.sapCaId && <Badge variant="secondary" className="text-[10px] h-4 px-1 text-gray-500">CA: {row.sapCaId}</Badge>}
                                </div>

                                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
                                    <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200">ID: {row.sapBpId}</Badge>

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
