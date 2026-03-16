import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Clock, Send, Loader2, Palette, Tv, BadgeCheck, RadioReceiver, Network, Building, Layers, MessageSquare } from "lucide-react";
import { useAuthContext } from "@/context/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";

// Interface for dropdown options
interface DropdownOption {
  name: string;
  value: string;
  country?: string;
}

interface OnboardingDropdowns {
  salesOrg: DropdownOption[];
  division: DropdownOption[];
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
const colorOptions = [
  { label: "Black", value: "0" },
  { label: "White", value: "1" },
  { label: "Red", value: "2" },
  { label: "Blue", value: "3" },
  { label: "Green", value: "4" },
  { label: "Yellow", value: "5" },
  { label: "Transparent", value: "7" }
];

export default function FingerprintRegTab() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const userCountry = user?.country;

  // Message State
  const [message, setMessage] = useState("");

  // Selected dropdown values for SalesOrg and Division
  const [selectedSalesOrg, setSelectedSalesOrg] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");

  // Service/Network/Transport States
  const [serviceId, setServiceId] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [transportId, setTransportId] = useState("");

  // Position States
  const [xPos, setXPos] = useState("");
  const [yPos, setYPos] = useState("");

  // Duration State
  const [duration, setDuration] = useState("");

  // Color States
  const [fontColor, setFontColor] = useState("1"); // Default White
  const [backgroundColor, setBackgroundColor] = useState("7"); // Default Transparent

  // Loading State
  const [loading, setLoading] = useState(false);

  // Fetch dropdown data
  const { data: dropdownData, isLoading: isLoadingDropdowns } = useQuery<OnboardingDropdowns>({
    queryKey: ['dropdowns', 'onboarding'],
    queryFn: async () => {
      const response = await apiRequest('/dropdowns/onboarding', 'GET');
      if (response.status === 'SUCCESS' && response.data) {
        return {
          salesOrg: response.data.salesOrg || [],
          division: response.data.division || []
        };
      }
      return { salesOrg: [], division: [] };
    },
    staleTime: 1000 * 60 * 30,
  });

  // Filter salesOrg based on user's country
  const filteredSalesOrgOptions = dropdownData?.salesOrg?.filter(
    (org) => org.country === userCountry
  ) || [];

  const divisionOptions = dropdownData?.division || [];

  // Auto-select if only one option exists
  useEffect(() => {
    if (filteredSalesOrgOptions.length === 1 && !selectedSalesOrg) {
      setSelectedSalesOrg(filteredSalesOrgOptions[0].value);
    }
  }, [filteredSalesOrgOptions, selectedSalesOrg]);

  useEffect(() => {
    if (divisionOptions.length === 1 && !selectedDivision) {
      setSelectedDivision(divisionOptions[0].value);
    }
  }, [divisionOptions, selectedDivision]);

  // --- Derived Unique Lists for Service Dropdowns ---
  const uniqueNetworkIds = useMemo(() => {
    return Array.from(new Set(SERVICE_DATA.filter(s => s.netId !== "0").map(item => item.netId))).sort();
  }, []);

  const uniqueTransportIds = useMemo(() => {
    return Array.from(new Set(SERVICE_DATA.filter(s => s.transId !== "0").map(item => item.transId))).sort();
  }, []);

  // --- Send Handler ---
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSalesOrg || !selectedDivision) {
      toast({
        title: "Validation Error",
        description: "Please select both Sales Org and Division.",
        variant: "destructive"
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a message.",
        variant: "destructive"
      });
      return;
    }

    if (!duration.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter display duration.",
        variant: "destructive"
      });
      return;
    }

    if (!xPos.trim() || !yPos.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter both X and Y position coordinates.",
        variant: "destructive"
      });
      return;
    }

    if (!serviceId) {
      toast({
        title: "Validation Error",
        description: "Please select a Service ID.",
        variant: "destructive"
      });
      return;
    }

    if (!networkId) {
      toast({
        title: "Validation Error",
        description: "Please select a Network ID.",
        variant: "destructive"
      });
      return;
    }

    if (!transportId) {
      toast({
        title: "Validation Error",
        description: "Please select a Transport ID.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const now = new Date();
    const tomorrow = addDays(now, 1);

    const payload = {
      operation: "FINGERPRINT_REG",
      sqNo: "",
      smartCardNo: "",
      stbNo: "",

      division: selectedDivision,
      salesOrg: selectedSalesOrg,
      sapBpId: "",
      sapCaId: "",

      startDate: format(now, "yyyyMMdd"),
      endDate: format(tomorrow, "yyyyMMdd"),
      startTime: format(now, "HHmmss"),
      endTime: "235959",

      messageText: message,

      persistence: "0",
      priority: "1",
      segmentNumber: "1",

      networkId: networkId,
      transportId: transportId,
      serviceId: serviceId,

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
        title: "Fingerprint Registration Sent",
        description: `Fingerprint settings registered successfully for Division ${selectedDivision}.`,
        duration: 4000
      });
      
      // Clear message and duration after successful send
      setMessage("");
      setDuration("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send fingerprint registration.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    setMessage("");
    setServiceId("");
    setNetworkId("");
    setTransportId("");
    setXPos("");
    setYPos("");
    setDuration("");
    setFontColor("1");
    setBackgroundColor("7");
    // Only reset if multiple options exist
    if (filteredSalesOrgOptions.length > 1) {
      setSelectedSalesOrg("");
    }
    if (divisionOptions.length > 1) {
      setSelectedDivision("");
    }
  };

  const positionPresets = [
    { label: "Top Left", x: "50", y: "50" },
    { label: "Top Right", x: "950", y: "50" },
    { label: "Bottom Left", x: "50", y: "650" },
    { label: "Bottom Right", x: "950", y: "650" },
    { label: "Center", x: "500", y: "350" }
  ];

  // Check if form is valid for submission
  const isFormValid = 
    selectedSalesOrg && 
    selectedDivision && 
    message.trim() &&
    duration.trim() && 
    xPos.trim() && 
    yPos.trim() && 
    serviceId &&
    networkId &&
    transportId;

  return (
    <div className="space-y-4">
      {/* Fingerprint Registration Form */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BadgeCheck className="h-5 w-5 text-green-600" />
            Fingerprint Registration Settings
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSend} className="space-y-6">

            {/* Row 1: Duration, Sales Org, Division */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Display Duration <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="Enter seconds"
                    required
                    className="pl-10 h-9"
                    min="1"
                    max="300"
                  />
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Duration in seconds (1-300)
                </p>
              </div>

              {/* Sales Org Dropdown */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Sales Org <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Select
                    value={selectedSalesOrg}
                    onValueChange={setSelectedSalesOrg}
                    disabled={isLoadingDropdowns || filteredSalesOrgOptions.length === 0}
                  >
                    <SelectTrigger className="h-9 pl-10">
                      <SelectValue placeholder={
                        isLoadingDropdowns ? "Loading..." :
                          filteredSalesOrgOptions.length === 0 ? "No options available" :
                            "Select Sales Org"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSalesOrgOptions.map((org) => (
                        <SelectItem key={org.value} value={org.value}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                </div>
              </div>

              {/* Division Dropdown */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Division <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Select
                    value={selectedDivision}
                    onValueChange={setSelectedDivision}
                    disabled={isLoadingDropdowns || divisionOptions.length === 0}
                  >
                    <SelectTrigger className="h-9 pl-10">
                      <SelectValue placeholder={
                        isLoadingDropdowns ? "Loading..." :
                          divisionOptions.length === 0 ? "No options available" :
                            "Select Division"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {divisionOptions.map((div) => (
                        <SelectItem key={div.value} value={div.value}>{div.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                </div>
              </div>
            </div>

            {/* Message Content - MANDATORY */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Fingerprint Message Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Enter your fingerprint message here..."
                required
                rows={4}
                className="resize-none"
                maxLength={800}
              />
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Message will be displayed as fingerprint on all devices in the selected Division</span>
                <span className={message.length > 750 ? "text-orange-500" : ""}>
                  {message.length}/800 characters
                </span>
              </div>
            </div>

            {/* Position */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Display Position <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                {positionPresets.map((preset, index) => {
                  const isSelected = xPos === preset.x && yPos === preset.y;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => { setXPos(preset.x); setYPos(preset.y); }}
                      className={`text-center p-2 text-xs border rounded-lg transition-all ${isSelected
                        ? "bg-green-600 text-white border-green-600 shadow-md transform scale-105"
                        : "bg-white hover:bg-green-600/10 text-gray-700 hover:border-green-600/30 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Input 
                    type="number" 
                    value={xPos} 
                    onChange={e => setXPos(e.target.value)} 
                    placeholder="X Position" 
                    required
                    className="h-9" 
                  />
                </div>
                <div className="space-y-1">
                  <Input 
                    type="number" 
                    value={yPos} 
                    onChange={e => setYPos(e.target.value)} 
                    placeholder="Y Position" 
                    required
                    className="h-9" 
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select a preset or enter custom X and Y coordinates for fingerprint display.
              </p>
            </div>

            {/* Appearance (Colors) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Font Color <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Select value={fontColor} onValueChange={setFontColor}>
                    <SelectTrigger className="h-9 pl-9">
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
                  <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Background Color <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Select value={backgroundColor} onValueChange={setBackgroundColor}>
                    <SelectTrigger className="h-9 pl-9">
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
                  <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                </div>
              </div>
            </div>

            {/* Service Configuration Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Service Configuration <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Service Dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Service ID <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Select value={serviceId} onValueChange={setServiceId}>
                      <SelectTrigger className="h-9 pl-9">
                        <SelectValue placeholder="Select Service" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {SERVICE_DATA.filter(s => s.id !== "0").map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Tv className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  </div>
                </div>

                {/* Network ID Dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Network ID <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Select value={networkId} onValueChange={setNetworkId}>
                      <SelectTrigger className="h-9 pl-9">
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
                    <Network className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  </div>
                </div>

                {/* Transport ID Dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Transport ID <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Select value={transportId} onValueChange={setTransportId}>
                      <SelectTrigger className="h-9 pl-9">
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
                    <RadioReceiver className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                All service configuration fields are required for fingerprint registration.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClearForm}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Clear Form
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !isFormValid}
                className="bg-green-600 hover:bg-green-700 text-white focus-visible:ring-green-600/50 disabled:bg-green-600 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Register Fingerprint Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}