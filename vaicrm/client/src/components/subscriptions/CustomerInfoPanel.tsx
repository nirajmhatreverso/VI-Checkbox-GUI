// src/components/subscriber-view/CustomerInfoPanel.tsx (Corrected & Upgraded)

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, Mail, Phone, Shield, ChevronUp, ChevronDown, History } from "lucide-react"; // ✅ CHANGED: Imported History icon

// ✅ CHANGE 1: Updated the props interface
interface CustomerInfoPanelProps {
  displayData: any;
  onOpenProvisioningHistory: () => void;
}

// Helper to format the full address object into a display string for the popover
const formatFullAddress = (addr: any) => {
  if (!addr) return 'N/A';
  const parts = [addr.address1, addr.address2, addr.ward, addr.city, addr.district, addr.region, addr.country, addr.postcode];
  return parts.filter(Boolean).join(', ') || 'N/A';
};

const AddressRow = ({ label, address }: { label: string; address: any }) => {
  const fullAddress = formatFullAddress(address);
  const needsPopover = fullAddress.length > 45;
  const truncatedAddress = needsPopover ? fullAddress.substring(0, 42) + '...' : fullAddress;

  return (
    <div className="flex items-baseline gap-x-2">
      <span className="text-gray-500 w-28 shrink-0">{label}:</span>
      <div className="flex-1 min-w-0 font-medium break-words">
        <span>{needsPopover ? truncatedAddress : fullAddress}</span>
        {needsPopover && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="link" size="xs" className="p-0 h-auto ml-1 text-azam-blue hover:text-blue-700">more</Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 text-sm" side="top" align="start">
              <div className="space-y-1"><p className="font-semibold">{label}</p><p className="text-gray-600">{fullAddress}</p></div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

// ✅ CHANGE 2: Updated component signature to use the new prop name
export default function CustomerInfoPanel({ displayData, onOpenProvisioningHistory }: CustomerInfoPanelProps) {
  const [customerInfoOpen, setCustomerInfoOpen] = useState(true);

  const getCustomerTypeBadge = (type: string) => (
    <Badge variant="outline" className={type?.toUpperCase() === "PREPAID" ? "border-blue-200 text-blue-700" : "border-purple-200 text-purple-700"}>
      {type || 'N/A'}
    </Badge>
  );

  const custProfile = displayData.custProfile || displayData.engagedPartyRole?.[0]?.custProfile || 'N/A';
  const custSegmt = displayData.custSegmt || displayData.engagedPartyRole?.[0]?.custSegmt || 'N/A';

  return (
    <>
      <Card className="bg-white shadow-lg border-gray-200 rounded-xl overflow-hidden">
        <CardHeader
          className="pb-4 cursor-pointer hover:bg-gray-50 transition-all duration-200 active:bg-gray-100"
          onClick={() => setCustomerInfoOpen(!customerInfoOpen)}
        >
          <CardTitle className="flex items-center justify-between text-base sm:text-base text-gray-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><User className="h-4 w-4 text-azam-blue" /></div>
              <div><span className="font-semibold">Customer Information</span><p className="text-xs text-gray-500 mt-0.5 sm:hidden">Tap to {customerInfoOpen ? 'collapse' : 'expand'}</p></div>
            </div>
            <div className="p-1 rounded-full hover:bg-gray-200 transition-colors">{customerInfoOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}</div>
          </CardTitle>
        </CardHeader>

        {customerInfoOpen && (
          <CardContent className="space-y-2 sm:space-y-3">
            {/* ✅ CHANGE 3: Improved layout for info fields */}
            <div className="grid grid-cols-1 gap-y-2 text-xs sm:text-sm">
              <div className="flex items-baseline gap-x-2"><span className="text-gray-500 w-28 shrink-0">Full Name:</span><span className="font-medium">{displayData.firstName} {displayData.lastName}</span></div>
              <div className="flex items-baseline gap-x-2"><span className="text-gray-500 w-28 shrink-0">Type:</span><span>{getCustomerTypeBadge(displayData.customerType)}</span></div>
              <div className="flex items-baseline gap-x-2"><span className="text-gray-500 w-28 shrink-0">Account Class:</span><span className="font-medium">{displayData.accountClass}</span></div>
             <div className="flex items-baseline gap-x-2"><span className="text-gray-500 w-28 shrink-0">Profile:</span><span className="font-medium">{custProfile}</span></div>
              <div className="flex items-baseline gap-x-2"><span className="text-gray-500 w-28 shrink-0">Segment:</span><span className="font-medium">{custSegmt}</span></div>
              <div className="flex items-baseline gap-x-2"><span className="text-gray-500 w-28 shrink-0">Connected:</span><span className="font-medium">{displayData.connectionDate}</span></div>
              <div className="flex items-baseline gap-x-2"><span className="text-gray-500 w-28 shrink-0">Division:</span><Badge variant="outline" className="w-fit text-xs">{displayData.divisionType}</Badge></div>
              <div className="col-span-2 sm:col-span-1"><AddressRow label="Billing Address" address={displayData.billingAddress} /></div>
              <div className="col-span-2 sm:col-span-1"><AddressRow label="Installation Address" address={displayData.installationAddress} /></div>
            </div>

            <div className="border-t border-gray-100 pt-2 sm:pt-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-gray-400" /><span className="text-gray-700 truncate">{displayData.email}</span></div>
                <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-gray-400" /><span className="text-gray-700">{displayData.mobile}</span></div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="bg-white shadow-lg border-gray-200 rounded-xl overflow-hidden">
        <CardHeader className="pb-4">
          {/* ✅ CHANGE 4: Updated Hardware Details header with new button */}
          <CardTitle className="flex items-center justify-between text-base sm:text-base text-gray-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Shield className="h-4 w-4 text-azam-blue" /></div>
              <span className="font-semibold">Hardware Details</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:bg-gray-200" title="View Provisioning History"
              onClick={(e) => {
                e.stopPropagation();
                onOpenProvisioningHistory();
              }}
            >
              <History className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>

        {/* CardContent is unchanged */}
        <CardContent className="space-y-2 sm:space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 text-xs sm:text-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0"><span className="text-gray-500">STB Model:</span><span className="font-medium">{displayData.hardware.stbModel || 'N/A'}</span></div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0"><span className="text-gray-500">STB Serial:</span><span className="font-mono text-xs break-all">{displayData.hardware.stbSerialNumber || 'N/A'}</span></div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0"><span className="text-gray-500">Smart Card:</span><span className="font-mono text-xs">{displayData.macId || 'N/A'}</span></div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0"><span className="text-gray-500">Purchase Date:</span><span className="font-medium">{displayData.hardware.purchaseDate}</span></div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0"><span className="text-gray-500">Warranty:</span><span className="font-medium">{displayData.hardware.warrantyEndDate}</span></div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0"><span className="text-gray-500">Condition:</span><Badge variant={displayData.hardware.condition === 'WORKING' ? 'default' : 'destructive'} className="w-fit text-xs">{displayData.hardware.condition}</Badge></div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0"><span className="text-gray-500">Agent ID:</span><span className="font-mono text-xs">{displayData.hardware.agentId}</span></div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}