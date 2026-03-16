// src/components/subscriber-view/SubscriberHeader.tsx (Corrected & Upgraded)

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Wallet, Download } from "lucide-react";

// ✅ CHANGE 1: Updated props interface to accept separate balances and currency
interface SubscriberHeaderProps {
  displayData: any;
  bpIds: string[];
  caIds: string[];
  contractNos: string[];
  selectedBpId: string;
  selectedCaId: string;
  selectedContractNo: string;
  onBpChange: (value: string) => void;
  onCaChange: (value: string) => void;
  onContractChange: (value: string) => void;
  onExportCustomer: () => void;
  hwBalance?: string;
  subsBalance?: string;
  walletCurrency?: string;
  allBalances?: { hwBalance: string; subsBalance: string; currency: string }[];
}

export default function SubscriberHeader({
  displayData, bpIds, caIds, contractNos,
  selectedBpId, selectedCaId, selectedContractNo,
  onBpChange, onCaChange, onContractChange,
  onExportCustomer,
  // ✅ CHANGE 2: Destructure new props
  hwBalance, subsBalance, walletCurrency, allBalances
}: SubscriberHeaderProps) {


  return (
    <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 shadow-sm">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left section with selectors (unchanged) */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/search-subscriber">
              <Button variant="outline" size="xs" className="text-gray-500 hover:text-gray-700 h-7 px-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="grid grid-rows-3 grid-cols-1 gap-3 w-full lg:flex lg:flex-nowrap lg:items-center lg:gap-3 lg:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium text-xs">BP ID:</span>
                <Select value={selectedBpId} onValueChange={onBpChange}>
                  <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{bpIds.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium text-xs">CA ID:</span>
                <Select value={selectedCaId} onValueChange={onCaChange}>
                  <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{caIds.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium text-xs">Contract ID:</span>
                <Select value={selectedContractNo} onValueChange={onContractChange}>
                  <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{contractNos.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ✅ CHANGE 3: Middle section with simplified balance badges */}
          <div className="flex flex-wrap items-center gap-3">
            {allBalances && allBalances.length > 0 ? (
              allBalances.map((bal, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-xl text-xs">
                    <Wallet className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700 font-semibold whitespace-nowrap">
                      Subs: {parseFloat(bal.subsBalance || '0').toLocaleString()} {bal.currency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-xl text-xs">
                    <Wallet className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-700 font-semibold whitespace-nowrap">
                      HW: {parseFloat(bal.hwBalance || '0').toLocaleString()} {bal.currency}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-xl text-xs">
                  <Wallet className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700 font-semibold whitespace-nowrap">
                    Subs: {parseFloat(subsBalance || '0').toLocaleString()} {walletCurrency}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-xl text-xs">
                  <Wallet className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-700 font-semibold whitespace-nowrap">
                    HW: {parseFloat(hwBalance || '0').toLocaleString()} {walletCurrency}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t lg:border-t-0 lg:border-l pt-2 lg:pt-0 lg:pl-3">
            <Button onClick={onExportCustomer} variant="outline" size="xs" className="h-8 px-3"><Download className="h-3 w-3 mr-1" />Export</Button>
          </div>
        </div>
      </div>
    </div>
  );
}