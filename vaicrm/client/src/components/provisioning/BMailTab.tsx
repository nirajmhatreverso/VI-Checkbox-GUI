import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Monitor, Send, Search, RefreshCw, Loader2, CheckCircle, UserCheck } from "lucide-react";
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

export default function BMailTab() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;

  // --- Search States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("sapBpId");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // --- B-Mail Form States ---
  const [scId, setScId] = useState(""); // Maps to smartCardNo
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Selected Context
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
    setScId(item.macId); // Pre-fill Target Device
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

    // Constructing Payload
    const payload = {
      operation: "BMAIL", // Using BMAIL for specific device targeting
      sqNo: "",

      smartCardNo: scId, // Target Device
      stbNo: "",

      // Context Data
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

      // Technical fields (Not used for B-Mail but mandatory in schema, sending 0/defaults)
      networkId: "0",
      transportId: "0",
      serviceId: "0",
      displayTime: "0",
      locationX: "0",
      locationY: "0",
      fontColor: "0",
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
        title: "B-Mail Sent",
        description: `Broadcast mail sent successfully to device ${scId}.`,
        duration: 4000
      });
      setMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send B-Mail. Please check the device ID.",
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
    {
      key: "actions",
      label: "Select",
      render: (_, item) => (
        <Button
          variant={scId === item.macId ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => handleSelectSubscriber(item)}
        >
          {scId === item.macId ? <CheckCircle className="h-4 w-4" /> : <UserCheck className="h-4 w-4 text-blue-600" />}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">

      {/* 1. Search Section */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm border-l-4 border-l-orange-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-orange-500" />
            Find Subscriber
          </CardTitle>
          <CardDescription className="text-xs">Locate subscriber to auto-fill details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex flex-col w-full md:w-1/3">
              <Label className="text-xs mb-1">Search Term</Label>
              <Input
                className="h-8 text-sm"
                placeholder={searchType === 'sapBpId' ? 'Enter BP ID...' : 'Enter ID/Mobile...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex flex-col w-full md:w-1/4">
              <Label className="text-xs mb-1">Search By</Label>
              <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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

      {/* 2. B-Mail Configuration Form */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-orange-600" />
            Broadcast Message Configuration
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
            {/* Device ID Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Target Device
              </label>
              <div className="relative">
                <Input
                  value={scId}
                  onChange={e => setScId(e.target.value)}
                  placeholder="Enter Smart Card No"
                  required
                  className="pl-10 font-medium"
                />
                <Monitor className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select from search above or enter manually
              </p>
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Message Content
              </label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Enter your broadcast message here..."
                required
                rows={5}
                className="resize-none focus:ring-orange-500"
              />
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Message will be stored in device mailbox</span>
                <span>{message.length}/1000 characters</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => {
                  setScId("");
                  setMessage("");
                  setSelectedContext(null);
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear Form
              </Button>

              <Button
                type="submit"
                size="xs"
                disabled={loading || !scId || !message}
                className="bg-azam-blue hover:bg-azam-blue/90 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send B-Mail
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