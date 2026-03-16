import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Send, Clock, Search, RefreshCw, Loader2, CheckCircle, UserCheck } from "lucide-react";
import { useAuthContext } from "@/context/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

// --- Types for Search ---
type SearchType = "sapBpId" | "macId" | "mobile" | "firstName";

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

export default function OSDTab() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;

  // --- Search States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("sapBpId");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // --- OSD Form States ---
  const [scId, setScId] = useState(""); // Maps to smartCardNo or stbNo
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);

  // Selected Context (to hold Division/SalesOrg from search result)
  const [selectedContext, setSelectedContext] = useState<{
    division: string;
    salesOrg: string;
    sapBpId: string;
    sapCaId: string;
  } | null>(null);

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
              division: rp.division || '11', // Capture Division from API
              salesOrg: rp.salesOrg || currentSalesOrg, // Capture SalesOrg from API
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
    setSelectedContext(null); // Reset selection on new search
    searchMutation.mutate({ type: searchType, term: searchTerm });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    searchMutation.reset();
  };

  // --- Select Subscriber Handler ---
  const handleSelectSubscriber = (item: SearchResult) => {
    setScId(item.macId); // Pre-fill Target Device with MAC ID
    setSelectedContext({
      division: item.division,
      salesOrg: item.salesOrg,
      sapBpId: item.sapBpId,
      sapCaId: item.sapCaId
    });

    toast({
      title: "Subscriber Selected",
      description: `Target set to ${item.macId} (${item.division})`
    });

    // Optional: Smooth scroll to form
    document.getElementById('osd-form-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Send OSD Handler ---
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const now = new Date();
    const tomorrow = addDays(now, 1);

    const payload = {
      operation: "OSD",
      sqNo: "",
      smartCardNo: scId, // Target Device ID
      stbNo: "",

      // Use Selected Context if available, else fallback to User Context
      division: selectedContext?.division || "11",
      salesOrg: selectedContext?.salesOrg || user?.salesOrg,
      sapBpId: selectedContext?.sapBpId || "",
      sapCaId: selectedContext?.sapCaId || "",

      startDate: format(now, "yyyyMMdd"),
      endDate: format(tomorrow, "yyyyMMdd"),
      startTime: format(now, "HHmmss"),
      endTime: "235959",
      messageText: message,

      // Defaults
      persistence: "0",
      priority: "1",
      segmentNumber: "1",
      networkId: "0",
      transportId: "0",
      serviceId: "0",
      displayTime: duration || "30",
      locationX: "10",
      locationY: "10",
      fontColor: "255",
      backgroundColor: "0",
      showTime: "false",
      showStb: "false",
      logo: "0",
      repetitionNb: "1",
      status: "",
      repetitionTime: "0"
    };

    try {
      await apiRequest("/provisioning/send-osd", "POST", payload);
      toast({
        title: "OSD Message Sent",
        description: `Message sent successfully to device ${scId}.`,
        duration: 4000
      });
      // Reset only message, keep ID for repetitive sending
      setMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OSD message.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Table Columns ---
  const searchColumns: DataTableColumn<SearchResult>[] = [
    { key: "displayName", label: "Name", sortable: true },
    { key: "sapBpId", label: "BP ID", sortable: true },
    { key: "division", label: "Division", render: (val) => <Badge variant="outline" className="text-[10px]">{val}</Badge> },
    { key: "macId", label: "MAC ID", render: (val) => <span className="font-mono text-xs">{val}</span> },
    { key: "contractNo", label: "Contract", sortable: true },
    {
      key: "actions",
      label: "Select",
      render: (_, item) => (
        <Button
          variant={scId === item.macId ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => handleSelectSubscriber(item)}
          title="Select this device"
        >
          {scId === item.macId ? <CheckCircle className="h-4 w-4" /> : <UserCheck className="h-4 w-4 text-blue-600" />}
        </Button>
      ),
    },
  ];

  const isBusy = searchMutation.isPending;

  return (
    <div className="space-y-4">

      {/* 1. Search Section */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm border-l-4 border-l-azam-blue">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-azam-blue " />
            Find Subscriber
          </CardTitle>
          <CardDescription className="text-xs">Search for a subscriber to auto-fill device and network details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex flex-col w-full md:w-1/3">
              <Label htmlFor="search-term" className="text-xs mb-1">Search Term</Label>
              <Input
                id="search-term"
                className="h-8 text-sm"
                placeholder={
                  searchType === 'sapBpId' ? 'Enter BP ID...' :
                    searchType === 'macId' ? 'Enter MAC ID...' :
                      searchType === 'firstName' ? 'Enter First Name...' :
                        'Enter Mobile...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={isBusy}
              />
            </div>
            <div className="flex flex-col w-full md:w-1/4">
              <Label htmlFor="search-type" className="text-xs mb-1">Search By</Label>
              <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)} disabled={isBusy}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sapBpId">SAP BP ID</SelectItem>
                  <SelectItem value="macId">MAC ID</SelectItem>
                  <SelectItem value="mobile">Mobile Number</SelectItem>
                  <SelectItem value="firstName">First Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8" onClick={handleSearch} disabled={isBusy}>
                {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
                Search
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={handleClearSearch} disabled={isBusy}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-md overflow-hidden">
              <DataTable
                data={searchResults}
                columns={searchColumns}
                showCount={false}
                emptyMessage="No results found."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. OSD Configuration Form */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm" id="osd-form-section">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-5 w-5 text-blue-600" />
            Message Configuration
          </CardTitle>
          {selectedContext && (
            <div className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded w-fit mt-1">
              <CheckCircle className="h-3 w-3" />
              Configured for Division: <b>{selectedContext.division}</b> | SalesOrg: <b>{selectedContext.salesOrg}</b>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSend} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Device ID Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Target Device
                </label>
                <div className="relative">
                  <Input
                    value={scId}
                    onChange={e => setScId(e.target.value)}
                    placeholder="Enter Smart Card No / MAC ID"
                    required
                    className="pl-10 font-medium"
                  />
                  <Monitor className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select from search above or enter manually
                </p>
              </div>

              {/* Duration Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Display Duration
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="30"
                    className="pl-10"
                  />
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Seconds (optional, defaults to 30)
                </p>
              </div>
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Message Content
              </label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Enter your message here... (e.g., Please recharge your account)"
                required
                rows={4}
                className="resize-none"
              />
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Message will appear as overlay on subscriber screens</span>
                <span>{message.length}/500 characters</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  setScId("");
                  setMessage("");
                  setDuration("");
                  setSelectedContext(null);
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Clear Form
              </Button>

              <Button
                type="submit"
                size="xs"
                disabled={loading || !scId || !message}
                className="bg-azam-blue hover:bg-azam-blue/90 text-white focus-visible:ring-azam-blue/50 disabled:bg-azam-blue disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send OSD Message
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