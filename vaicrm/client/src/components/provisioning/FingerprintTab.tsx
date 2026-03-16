import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Target, Clock, Send, Search, RefreshCw, Loader2, CheckCircle, UserCheck, Palette, Tv, RadioReceiver, Network } from "lucide-react";
import { useAuthContext } from "@/context/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

// --- Types for Search ---
type SearchType = "sapBpId" | "macId" | "mobile";

interface SearchResult {
  displayName: string;
  sapBpId: string;
  sapCaId: string;
  contractNo: string | null;
  macId: string;
  division: string;
  salesOrg: string;
  mobile: string;
  actions?: null;
}

// --- Service Data Configuration ---
const SERVICE_DATA = [
  { id: "100", name: "Azam Xtra", netId: "126", transId: "60100" },
  { id: "101", name: "Azam One", netId: "126", transId: "60302" },
  { id: "102", name: "Azam Two", netId: "126", transId: "60302" },
  { id: "106", name: "Sinema Zetu", netId: "126", transId: "60302" },
  { id: "108", name: "UTV", netId: "126", transId: "60302" },
  { id: "111", name: "Azam Sports 1 HD", netId: "126", transId: "60302" },
  { id: "112", name: "Azam Sports 2 HD", netId: "126", transId: "60302" },
  { id: "113", name: "Azam Sports 3 HD", netId: "126", transId: "60302" },
  { id: "114", name: "Azam Sports 4 HD", netId: "126", transId: "60302" },
  { id: "120", name: "ESPN", netId: "126", transId: "60100" },
  { id: "121", name: "ESPN 2", netId: "126", transId: "60100" },
  { id: "125", name: "LFC TV", netId: "126", transId: "60100" },
  { id: "132", name: "MBC + Power", netId: "126", transId: "60400" },
  { id: "133", name: "MBC 2", netId: "126", transId: "60400" },
  { id: "134", name: "MBC Max", netId: "126", transId: "60400" },
  { id: "135", name: "MBC Action", netId: "126", transId: "60400" },
  { id: "136", name: "MBC 4", netId: "126", transId: "60400" },
  { id: "137", name: "KIX Movies", netId: "126", transId: "60100" },
  { id: "146", name: "AMC Series", netId: "126", transId: "60400" },
  { id: "147", name: "African Movie channel", netId: "126", transId: "60400" },
  { id: "148", name: "Nina TV", netId: "126", transId: "60301" },
  { id: "149", name: "Romanza Africa", netId: "126", transId: "60301" },
  { id: "160", name: "BET", netId: "126", transId: "60100" },
  { id: "163", name: "Star Life", netId: "126", transId: "60301" },
  { id: "172", name: "MTV Base", netId: "126", transId: "60301" },
  { id: "174", name: "Trace Mziki", netId: "126", transId: "60400" },
  { id: "183", name: "National Geographic", netId: "126", transId: "60400" },
  { id: "184", name: "Nat Geo Wild", netId: "126", transId: "60400" },
  { id: "191", name: "History", netId: "126", transId: "60400" },
  { id: "192", name: "Discovery Africa", netId: "126", transId: "60400" },
  { id: "200", name: "ID", netId: "126", transId: "60400" },
  { id: "205", name: "Real Time", netId: "126", transId: "60100" },
  { id: "206", name: "Travel XP", netId: "126", transId: "60100" },
  { id: "210", name: "Foodies", netId: "126", transId: "60100" },
  { id: "220", name: "Nickelodeon", netId: "126", transId: "60400" },
  { id: "221", name: "Boing", netId: "126", transId: "60400" },
  { id: "222", name: "Fix & Foxi", netId: "126", transId: "60400" },
  { id: "223", name: "Baby TV", netId: "126", transId: "60400" },
  { id: "225", name: "Cbeebies", netId: "126", transId: "60100" },
  { id: "226", name: "Cartoon Network", netId: "126", transId: "60100" },
  { id: "227", name: "Boomerang / Cartoonito", netId: "126", transId: "60100" },
  { id: "230", name: "BBC World News", netId: "126", transId: "60301" },
  { id: "231", name: "Al Jazeera English", netId: "126", transId: "60301" },
  { id: "232", name: "Fox News", netId: "126", transId: "60400" },
  { id: "233", name: "MSNBC", netId: "126", transId: "60400" },
  { id: "234", name: "France 24 English", netId: "126", transId: "60400" },
  { id: "235", name: "Africa News", netId: "126", transId: "60301" },
  { id: "237", name: "Bloomberg", netId: "126", transId: "60300" },
  { id: "238", name: "CGTN", netId: "126", transId: "60303" },
  { id: "239", name: "CNN", netId: "126", transId: "60301" },
  { id: "240", name: "France 24 French", netId: "126", transId: "60301" },
  { id: "241", name: "euronews (German)", netId: "126", transId: "60400" },
  { id: "245", name: "Rai Italia", netId: "126", transId: "60400" },
  { id: "250", name: "TVE International", netId: "127", transId: "60303" },
  { id: "251", name: "Wanasah", netId: "126", transId: "60400" },
  { id: "252", name: "MBC Drama", netId: "126", transId: "60400" },
  { id: "253", name: "Al Jazeera News Arabic", netId: "126", transId: "60400" },
  { id: "254", name: "MBC 3", netId: "126", transId: "60400" },
  { id: "260", name: "Star Vijay Internatinal", netId: "126", transId: "60301" },
  { id: "261", name: "Puthiya Thalamurai", netId: "126", transId: "60301" },
  { id: "271", name: "Asianet Middle East", netId: "126", transId: "60301" },
  { id: "272", name: "Mazhavil Manorama", netId: "126", transId: "60301" },
  { id: "280", name: "ETV Telugu", netId: "126", transId: "60400" },
  { id: "281", name: "Maa TV", netId: "126", transId: "60400" },
  { id: "290", name: "Star Plus ME", netId: "126", transId: "60100" },
  { id: "291", name: "Colors International", netId: "126", transId: "60100" },
  { id: "292", name: "Sony SET", netId: "126", transId: "60100" },
  { id: "293", name: "Sony SAB", netId: "126", transId: "60301" },
  { id: "294", name: "Colors Rishtey", netId: "126", transId: "60301" },
  { id: "295", name: "Star Bharath", netId: "126", transId: "60100" },
  { id: "306", name: "MBC Bollywood", netId: "126", transId: "60400" },
  { id: "307", name: "Star Gold International", netId: "126", transId: "60100" },
  { id: "308", name: "Sony Max", netId: "126", transId: "60301" },
  { id: "321", name: "Zoom", netId: "126", transId: "60100" },
  { id: "325", name: "News 18 International", netId: "126", transId: "60100" },
  { id: "330", name: "KBC", netId: "126", transId: "60303" },
  { id: "331", name: "Citizen TV", netId: "126", transId: "60303" },
  { id: "332", name: "K24", netId: "126", transId: "60303" },
  { id: "333", name: "NTV Kenya", netId: "126", transId: "60303" },
  { id: "334", name: "KTN", netId: "126", transId: "60303" },
  { id: "335", name: "KTN NEWS", netId: "126", transId: "60303" },
  { id: "336", name: "Kass TV", netId: "126", transId: "60301" },
  { id: "337", name: "INOORO TV", netId: "126", transId: "60301" },
  { id: "339", name: "Ramogi TV", netId: "126", transId: "60301" },
  { id: "340", name: "Al Huda TV", netId: "126", transId: "60303" },
  { id: "341", name: "Horizon TV", netId: "126", transId: "60301" },
  { id: "342", name: "WERU TV", netId: "127", transId: "60303" },
  { id: "343", name: "TV 47", netId: "128", transId: "60303" },
  { id: "350", name: "UBC", netId: "126", transId: "60303" },
  { id: "351", name: "NTV Uganda", netId: "126", transId: "60303" },
  { id: "352", name: "NBS TV", netId: "126", transId: "60303" },
  { id: "353", name: "Bukedde TV 1", netId: "126", transId: "60301" },
  { id: "354", name: "Bukedde TV 2", netId: "126", transId: "60301" },
  { id: "355", name: "BBS TV", netId: "126", transId: "60303" },
  { id: "357", name: "TV West", netId: "126", transId: "60301" },
  { id: "358", name: "Spark TV", netId: "126", transId: "60301" },
  { id: "359", name: "Salt TV", netId: "126", transId: "60301" },
  { id: "360", name: "Channel 44", netId: "126", transId: "60301" },
  { id: "361", name: "TOP TV", netId: "126", transId: "60301" },
  { id: "362", name: "Chamuka TV", netId: "126", transId: "60301" },
  { id: "363", name: "KTV", netId: "126", transId: "60303" },
  { id: "364", name: "KSTV", netId: "126", transId: "60301" },
  { id: "365", name: "KBS TV", netId: "126", transId: "60303" },
  { id: "366", name: "Sanyuka TV", netId: "126", transId: "60303" },
  { id: "370", name: "Rwanda TV", netId: "126", transId: "60301" },
  { id: "371", name: "TV 10", netId: "126", transId: "60303" },
  { id: "372", name: "KC2 TV", netId: "126", transId: "60303" },
  { id: "375", name: "Universal TV", netId: "126", transId: "60300" },
  { id: "380", name: "Malawi National TV", netId: "126", transId: "60301" },
  { id: "381", name: "Times TV (TTV)", netId: "126", transId: "60301" },
  { id: "382", name: "Zodiak TV", netId: "126", transId: "60301" },
  { id: "383", name: "Mibawa TV", netId: "126", transId: "60303" },
  { id: "384", name: "MBC TV 2 (Malawi)", netId: "126", transId: "60301" },
  { id: "385", name: "Great Dominion", netId: "126", transId: "60303" },
  { id: "386", name: "Luntha TV", netId: "126", transId: "60303" },
  { id: "387", name: "TV Islam", netId: "126", transId: "60303" },
  { id: "388", name: "Mpira TV", netId: "126", transId: "60301" },
  { id: "389", name: "Mzati TV", netId: "126", transId: "60303" },
  { id: "390", name: "Hope Channel Malawi", netId: "126", transId: "60400" },
  { id: "395", name: "ZBC TV (Zimbabwe)", netId: "126", transId: "60303" },
  { id: "396", name: "Jive TV", netId: "126", transId: "60303" },
  { id: "398", name: "KeYonaTV (Zimbabwe)", netId: "126", transId: "60301" },
  { id: "400", name: "TBC 1", netId: "126", transId: "60303" },
  { id: "401", name: "Tanzania Safari Channel", netId: "126", transId: "60301" },
  { id: "402", name: "Channel 10", netId: "126", transId: "60303" },
  { id: "403", name: "Clouds TV", netId: "126", transId: "60303" },
  { id: "404", name: "Star TV Tanzania", netId: "126", transId: "60301" },
  { id: "405", name: "ZBC", netId: "126", transId: "60303" },
  { id: "406", name: "ZBC 2", netId: "126", transId: "60302" },
  { id: "407", name: "TV - E", netId: "126", transId: "60301" },
  { id: "408", name: "ITV", netId: "126", transId: "60303" },
  { id: "409", name: "EATV", netId: "126", transId: "60303" },
  { id: "410", name: "Capital TV", netId: "126", transId: "60301" },
  { id: "411", name: "Wasafi TV", netId: "126", transId: "60303" },
  { id: "412", name: "Channel 10 Plus", netId: "126", transId: "60303" },
  { id: "413", name: "Zamaradi TV", netId: "126", transId: "60303" },
  { id: "414", name: "Cheka Plus TV", netId: "126", transId: "60303" },
  { id: "415", name: "Crown TV", netId: "126", transId: "60100" },
  { id: "416", name: "TV3 SPORT", netId: "126", transId: "60100" },
  { id: "417", name: "Sunet TV", netId: "126", transId: "60100" },
  { id: "418", name: "JEHOVA JIRE TV", netId: "127", transId: "60100" },
  { id: "419", name: "Furaha TV", netId: "128", transId: "60100" },
  { id: "455", name: "Mahaasin TV", netId: "126", transId: "60303" },
  { id: "456", name: "TV Imaan", netId: "126", transId: "60303" },
  { id: "0", name: "ALL", netId: "0", transId: "0" }
];

// --- Color Configuration ---
// 0 Black, 1 White, 2 Red, 3 Blue, 4 Green, 5 Yellow, 7 Transparent
const colorOptions = [
  { label: "Black", value: "0" },
  { label: "White", value: "1" },
  { label: "Red", value: "2" },
  { label: "Blue", value: "3" },
  { label: "Green", value: "4" },
  { label: "Yellow", value: "5" },
  { label: "Transparent", value: "7" }
];

export default function FingerprintTab() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;

  // --- Search States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("sapBpId");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // --- Fingerprint Form States ---
  const [target, setTarget] = useState("");

  // New States for Service/Network/Transport
  const [serviceId, setServiceId] = useState("0");
  const [networkId, setNetworkId] = useState("0");
  const [transportId, setTransportId] = useState("0");

  const [xPos, setXPos] = useState("");
  const [yPos, setYPos] = useState("");
  const [duration, setDuration] = useState("");

  // Color States (Defaults: Font White (1), BG Transparent (7))
  const [fontColor, setFontColor] = useState("1");
  const [backgroundColor, setBackgroundColor] = useState("7");

  const [loading, setLoading] = useState(false);

  // Selected Context
  const [selectedContext, setSelectedContext] = useState<{
    division: string;
    salesOrg: string;
    sapBpId: string;
    sapCaId: string;
  } | null>(null);

  // --- Derived Unique Lists for Dropdowns ---
  const uniqueNetworkIds = useMemo(() => {
    return Array.from(new Set(SERVICE_DATA.map(item => item.netId))).sort();
  }, []);

  const uniqueTransportIds = useMemo(() => {
    return Array.from(new Set(SERVICE_DATA.map(item => item.transId))).sort();
  }, []);

  // --- Search Mutation ---
  const searchMutation = useMutation({
    mutationFn: (searchData: { type: SearchType; term: string }) => {
      const apiPayload = {
        [searchData.type]: searchData.term,
        salesOrg: currentSalesOrg || "",
      };
      return apiRequest('/subscriptions/search-customers', 'POST', apiPayload);
    },
    onSuccess: (response) => {
      if (response.status !== "SUCCESS" || !response.data || !response.data.customerDetails || response.data.customerDetails.length === 0) {
        toast({ title: "No Results", description: "No customer records found.", variant: "destructive" });
        setSearchResults([]);
        return;
      }

      const customerDetails = response.data.customerDetails;
      const flattenedResults: SearchResult[] = [];

      customerDetails.forEach((customer: any) => {
        const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
        const mobileObj = customer.contactMedium?.find((c: any) => c.type === 'mobile');
        const mobile = mobileObj ? mobileObj.value : 'N/A';

        if (customer.relatedParty && Array.isArray(customer.relatedParty)) {
          customer.relatedParty.forEach((rp: any) => {
            flattenedResults.push({
              displayName: name,
              sapBpId: rp.sapBpId || 'N/A',
              sapCaId: rp.sapCaId || 'N/A',
              contractNo: rp.contractNo || 'N/A',
              macId: rp.Mac || 'N/A',
              division: rp.division || '11',
              salesOrg: rp.salesOrg || currentSalesOrg,
              mobile: mobile,
            });
          });
        }
      });
      setSearchResults(flattenedResults);
    },
    onError: (error: any) => {
      toast({ title: "Search Error", description: error.statusMessage || "Error searching subscriber.", variant: "destructive" });
      setSearchResults([]);
    }
  });

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    setSearchResults([]);
    setSelectedContext(null);
    searchMutation.mutate({ type: searchType, term: searchTerm });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    searchMutation.reset();
  };

  const handleSelectSubscriber = (item: SearchResult) => {
    setTarget(item.macId);
    setSelectedContext({
      division: item.division,
      salesOrg: item.salesOrg,
      sapBpId: item.sapBpId,
      sapCaId: item.sapCaId
    });

    toast({
      title: "Subscriber Selected",
      description: `Target set to ${item.macId}`
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const now = new Date();
    const tomorrow = addDays(now, 1);

    const payload = {
      operation: "FINGERPRINT",
      sqNo: "",
      smartCardNo: target,
      stbNo: "",

      division: selectedContext?.division || "11",
      salesOrg: selectedContext?.salesOrg || user?.salesOrg,
      sapBpId: selectedContext?.sapBpId || "",
      sapCaId: selectedContext?.sapCaId || "",

      startDate: format(now, "yyyyMMdd"),
      endDate: format(tomorrow, "yyyyMMdd"),
      startTime: format(now, "HHmmss"),
      endTime: "235959",

      messageText: "",

      persistence: "0",
      priority: "1",
      segmentNumber: "1",

      // --- DYNAMIC VALUES FROM INDIVIDUAL DROPDOWNS ---
      networkId: networkId,
      transportId: transportId,
      serviceId: serviceId,
      // ------------------------------------

      displayTime: duration,
      locationX: xPos,
      locationY: yPos,
      fontColor: fontColor,
      backgroundColor: backgroundColor,

      showTime: "true",
      showStb: "true",
      logo: "0",
      repetitionNb: "1",
      status: "",
      repetitionTime: "0"
    };

    try {
      await apiRequest("/provisioning/send-osd", "POST", payload);
      toast({
        title: "Fingerprint Sent",
        description: `Fingerprint sent successfully to ${target}.`,
        duration: 4000
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send fingerprint.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const searchColumns: DataTableColumn<SearchResult>[] = [
    { key: "displayName", label: "Name", sortable: true },
    { key: "sapBpId", label: "BP ID", sortable: true },
    { key: "division", label: "Division", render: (val) => <Badge variant="outline" className="text-[10px]">{val}</Badge> },
    { key: "macId", label: "MAC ID", render: (val) => <span className="font-mono text-xs">{val}</span> },
    {
      key: "actions",
      label: "Select",
      render: (_, item) => (
        <Button
          variant={target === item.macId ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => handleSelectSubscriber(item)}
        >
          {target === item.macId ? <CheckCircle className="h-4 w-4" /> : <UserCheck className="h-4 w-4 text-blue-600" />}
        </Button>
      ),
    },
  ];

  const positionPresets = [
    { label: "Top Left", x: "50", y: "50" },
    { label: "Top Right", x: "950", y: "50" },
    { label: "Bottom Left", x: "50", y: "650" },
    { label: "Bottom Right", x: "950", y: "650" },
    { label: "Center", x: "500", y: "350" }
  ];

  return (
    <div className="space-y-4">

      {/* 1. Search Section */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm border-l-4 border-l-azam-orange">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-azam-orange" />
            Find Subscriber
          </CardTitle>
          <CardDescription className="text-xs">Locate subscriber to auto-fill ID and Division.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex flex-col w-full md:w-1/3">
              <Label className="text-xs mb-1">Search Term</Label>
              <Input
                uiSize="sm"
                className="text-sm"
                placeholder={searchType === 'sapBpId' ? 'Enter BP ID...' : 'Enter ID/Mobile...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex flex-col w-full md:w-1/4">
              <Label className="text-xs mb-1">Search By</Label>
              <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
                <SelectTrigger uiSize="sm" className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sapBpId">SAP BP ID</SelectItem>
                  <SelectItem value="macId">MAC ID</SelectItem>
                  <SelectItem value="mobile">Mobile Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8" onClick={handleSearch} disabled={searchMutation.isPending}>
              {searchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Search"}
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={handleClearSearch}><RefreshCw className="h-3 w-3" /></Button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-md overflow-hidden">
              <DataTable data={searchResults} columns={searchColumns} showCount={false} emptyMessage="No results found." />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Fingerprint Form */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-azam-orange" />
            Fingerprint Configuration
          </CardTitle>
          {selectedContext && (
            <div className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded w-fit mt-1">
              <CheckCircle className="h-3 w-3" />
              Targeting <b>{selectedContext.division}</b> | SalesOrg: <b>{selectedContext.salesOrg}</b>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSend} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Target Input */}
              <div className="space-y-2">
                <Label>Target Device</Label>
                <div className="relative">
                  <Input
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    placeholder="Enter Smart Card No"
                    required
                    className="pl-10 font-medium"
                  />
                  <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Position */}
            <div className="space-y-3">
              <Label>Display Position</Label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                {positionPresets.map((preset, index) => {
                  const isSelected = xPos === preset.x && yPos === preset.y;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => { setXPos(preset.x); setYPos(preset.y); }}
                      className={`text-center p-2 text-xs border rounded-lg transition-all ${isSelected
                        ? "bg-azam-orange text-white border-azam-orange shadow-md transform scale-105"
                        : "bg-white hover:bg-azam-orange/10 text-gray-700 hover:border-azam-orange/30"
                        }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input type="number" value={xPos} onChange={e => setXPos(e.target.value)} placeholder="X (50)" required />
                <Input type="number" value={yPos} onChange={e => setYPos(e.target.value)} placeholder="Y (50)" required />
              </div>
            </div>

            {/* Appearance (Colors) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Font Color</Label>
                <div className="relative">
                  <Select value={fontColor} onValueChange={setFontColor}>
                    <SelectTrigger uiSize="sm" className="pl-9">
                      <SelectValue placeholder="Select Color" />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: color.label === 'Transparent' ? 'transparent' : color.label.toLowerCase() }}></span>
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="relative">
                  <Select value={backgroundColor} onValueChange={setBackgroundColor}>
                    <SelectTrigger uiSize="sm" className="pl-9">
                      <SelectValue placeholder="Select Color" />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: color.label === 'Transparent' ? 'transparent' : color.label.toLowerCase() }}></span>
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Service Configuration Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900">Service Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Service Dropdown */}
                <div className="space-y-2">
                  <Label>Service ID</Label>
                  <div className="relative">
                    <Select value={serviceId} onValueChange={setServiceId}>
                      <SelectTrigger uiSize="sm" className="pl-9">
                        <SelectValue placeholder="Select Service" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {SERVICE_DATA.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Tv className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Network ID Dropdown */}
                <div className="space-y-2">
                  <Label>Network ID</Label>
                  <div className="relative">
                    <Select value={networkId} onValueChange={setNetworkId}>
                      <SelectTrigger uiSize="sm" className="pl-9">
                        <SelectValue placeholder="Select Network ID" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueNetworkIds.map((nid) => (
                          <SelectItem key={nid} value={nid}>
                            {nid}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Network className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Transport ID Dropdown */}
                <div className="space-y-2">
                  <Label>Transport ID</Label>
                  <div className="relative">
                    <Select value={transportId} onValueChange={setTransportId}>
                      <SelectTrigger uiSize="sm" className="pl-9">
                        <SelectValue placeholder="Select Transport ID" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {uniqueTransportIds.map((tid) => (
                          <SelectItem key={tid} value={tid}>
                            {tid}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <RadioReceiver className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration (Seconds)</Label>
              <div className="relative">
                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="3600" required className="pl-10" />
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" size="xs" variant="outline" onClick={() => {
                setTarget("");
                setServiceId("0");
                setNetworkId("0");
                setTransportId("0");
                setXPos("");
                setYPos("");
                setDuration("");
                setFontColor("1");
                setBackgroundColor("7");
                setSelectedContext(null);
              }}>
                Clear
              </Button>
              <Button type="submit" size="xs" disabled={loading || !target || !xPos || !yPos || !duration} className="bg-azam-blue hover:bg-azam-blue/90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send Fingerprint
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}