import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Loader2, Building, Layers } from "lucide-react";
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

export default function BMailRegTab() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const userCountry = user?.country;

  // Selected dropdown values for SalesOrg and Division
  const [selectedSalesOrg, setSelectedSalesOrg] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");

  // Registration Message State
  const [registrationMessage, setRegistrationMessage] = useState("");

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

    if (!registrationMessage.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a registration message.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const now = new Date();
    const tomorrow = addDays(now, 1);

    const payload = {
      operation: "BMAIL_REG",
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

      messageText: registrationMessage,

      persistence: "0",
      priority: "1",
      segmentNumber: "1",

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
        title: "B-Mail Registration Sent",
        description: `B-Mail service registered successfully for Division ${selectedDivision}.`,
        duration: 4000
      });
      setRegistrationMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send B-Mail registration.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    setRegistrationMessage("");
    // Only reset if multiple options exist
    if (filteredSalesOrgOptions.length > 1) {
      setSelectedSalesOrg("");
    }
    if (divisionOptions.length > 1) {
      setSelectedDivision("");
    }
  };

  // Check if form is valid
  const isFormValid = selectedSalesOrg && selectedDivision && registrationMessage.trim();

  return (
    <div className="space-y-4">
      {/* B-Mail Registration Form */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-blue-600" />
            B-Mail Service Registration
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSend} className="space-y-6">

            {/* Row 1: Sales Org, Division */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Registration Message Input - MANDATORY */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Registration Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={registrationMessage}
                onChange={e => setRegistrationMessage(e.target.value)}
                placeholder="Enter a message to send upon B-Mail registration (e.g., 'Welcome to B-Mail service!')"
                rows={4}
                required
                className="resize-none focus:ring-blue-500"
                maxLength={1000}
              />
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Message will be broadcast to all devices in the selected Division</span>
                <span className={registrationMessage.length > 900 ? "text-orange-500" : ""}>
                  {registrationMessage.length}/1000 characters
                </span>
              </div>
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
                className="bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-600/50 disabled:bg-blue-600 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Register B-Mail Service
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