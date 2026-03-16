import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, AlertCircle, CheckCircle2, Clock, ChevronLeft, ChevronRight } from "lucide-react";

interface LedgerTableProps {
  type: "payment" | "commission";
  data: any[];
  isLoading: boolean;
}

const PAYMENT_COLUMNS = [
  { label: "Date", key: "date", icon: "📅" },
  { label: "Description", key: "description", icon: "📝" },
  { label: "Reference", key: "reference", icon: "🔗" },
  { label: "Type", key: "type", icon: "💳" },
  { label: "Amount", key: "amount", icon: "💰" },
  { label: "Balance", key: "balance", icon: "💳" },
];

const COMMISSION_COLUMNS = [
  { label: "Date", key: "date", icon: "📅" },
  { label: "Description", key: "description", icon: "📝" },
  { label: "Commission Rate", key: "rate", icon: "📊" },
  { label: "Gross Amount", key: "gross", icon: "💰" },
  { label: "WHT (10%)", key: "wht", icon: "🏛️" },
  { label: "VAT (18%)", key: "vat", icon: "📋" },
  { label: "Net Amount", key: "net", icon: "✅" },
  { label: "Status", key: "status", icon: "🔄" },
];

// Mock data for demonstration
const mockPaymentData = [
  {
    date: "2024-01-15",
    description: "Customer Payment - STB Sale",
    reference: "PAY-2024-001",
    type: "Credit",
    amount: 125000,
    balance: 125000
  },
  {
    date: "2024-01-16", 
    description: "Commission Payout",
    reference: "COM-2024-001",
    type: "Debit",
    amount: 6250,
    balance: 118750
  },
  {
    date: "2024-01-17",
    description: "Hardware Return Refund",
    reference: "REF-2024-001",
    type: "Credit",
    amount: 85000,
    balance: 203750
  },
  {
    date: "2024-01-18",
    description: "Subscription Payment",
    reference: "PAY-2024-002",
    type: "Credit",
    amount: 45000,
    balance: 248750
  },
  {
    date: "2024-01-19",
    description: "Agent Fee Deduction",
    reference: "FEE-2024-001",
    type: "Debit",
    amount: 2500,
    balance: 246250
  },
  {
    date: "2024-01-20",
    description: "Customer Payment - Bundle Package",
    reference: "PAY-2024-003",
    type: "Credit",
    amount: 75000,
    balance: 321250
  },
  {
    date: "2024-01-21",
    description: "Commission Payout",
    reference: "COM-2024-002",
    type: "Debit",
    amount: 4500,
    balance: 316750
  },
  {
    date: "2024-01-22",
    description: "Customer Payment - STB Sale",
    reference: "PAY-2024-004",
    type: "Credit",
    amount: 95000,
    balance: 411750
  },
  {
    date: "2024-01-23",
    description: "System Adjustment",
    reference: "ADJ-2024-001",
    type: "Debit",
    amount: 1200,
    balance: 410550
  },
  {
    date: "2024-01-24",
    description: "Customer Payment - Premium Package",
    reference: "PAY-2024-005",
    type: "Credit",
    amount: 150000,
    balance: 560550
  },
  {
    date: "2024-01-25",
    description: "Commission Payout",
    reference: "COM-2024-003",
    type: "Debit",
    amount: 7500,
    balance: 553050
  },
  {
    date: "2024-01-26",
    description: "Customer Payment - Basic Package",
    reference: "PAY-2024-006",
    type: "Credit",
    amount: 35000,
    balance: 588050
  }
];

const mockCommissionData = [
  {
    date: "2024-01-15",
    description: "STB Sale Commission",
    rate: "5%",
    gross: 6250,
    wht: 625,
    vat: 1013,
    net: 4612,
    status: "Paid"
  },
  {
    date: "2024-01-16",
    description: "Subscription Sale Commission", 
    rate: "8%",
    gross: 4800,
    wht: 480,
    vat: 777,
    net: 3543,
    status: "Pending"
  },
  {
    date: "2024-01-17",
    description: "Bundle Package Commission",
    rate: "6%",
    gross: 3600,
    wht: 360,
    vat: 583,
    net: 2657,
    status: "Paid"
  },
  {
    date: "2024-01-18",
    description: "Premium Package Commission",
    rate: "7%",
    gross: 5250,
    wht: 525,
    vat: 851,
    net: 3874,
    status: "Paid"
  },
  {
    date: "2024-01-19",
    description: "Basic Package Commission",
    rate: "4%",
    gross: 1400,
    wht: 140,
    vat: 227,
    net: 1033,
    status: "Pending"
  },
  {
    date: "2024-01-20",
    description: "STB Upgrade Commission",
    rate: "5%",
    gross: 2750,
    wht: 275,
    vat: 446,
    net: 2029,
    status: "Paid"
  },
  {
    date: "2024-01-21",
    description: "Family Bundle Commission",
    rate: "6%",
    gross: 4500,
    wht: 450,
    vat: 729,
    net: 3321,
    status: "Pending"
  },
  {
    date: "2024-01-22",
    description: "Sports Package Commission",
    rate: "8%",
    gross: 3200,
    wht: 320,
    vat: 518,
    net: 2362,
    status: "Paid"
  },
  {
    date: "2024-01-23",
    description: "Entertainment Package Commission",
    rate: "7%",
    gross: 4900,
    wht: 490,
    vat: 794,
    net: 3616,
    status: "Paid"
  },
  {
    date: "2024-01-24",
    description: "News Package Commission",
    rate: "5%",
    gross: 1750,
    wht: 175,
    vat: 284,
    net: 1291,
    status: "Pending"
  },
  {
    date: "2024-01-25",
    description: "Movies Package Commission",
    rate: "9%",
    gross: 5400,
    wht: 540,
    vat: 875,
    net: 3985,
    status: "Paid"
  },
  {
    date: "2024-01-26",
    description: "Kids Package Commission",
    rate: "6%",
    gross: 2100,
    wht: 210,
    vat: 340,
    net: 1550,
    status: "Pending"
  }
];

export default function LedgerTable({ type, data, isLoading }: LedgerTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const columns = type === "payment" ? PAYMENT_COLUMNS : COMMISSION_COLUMNS;
  
  // Use mock data if no real data is available
  const allData = data.length > 0 ? data : (type === "payment" ? mockPaymentData : mockCommissionData);
  
  // Calculate pagination
  const totalPages = Math.ceil(allData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayData = allData.slice(startIndex, endIndex);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'failed':
      case 'rejected':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
      case 'pending':
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      case 'failed':
      case 'rejected':
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800";
    }
  };

  const formatCurrency = (value: any) => {
    if (value === undefined || value === null) return "";
    return Number(value).toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Loading {type} records...</p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Please wait while we fetch your data</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === "payment" ? (
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {type === "payment" ? "Payment Transaction History" : "Commission Breakdown Details"}
            </h3>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-100">
            {displayData.length} Records
          </Badge>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map(col => (
                <th 
                  key={col.key} 
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{col.icon}</span>
                    {col.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {displayData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16">
                  <div className="flex flex-col items-center">
                    <FileText className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No records found</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      No {type} transactions found for the selected period.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              displayData.map((row, idx) => (
                <tr 
                  key={idx} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 ${
                    idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-700/25'
                  }`}
                >
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm">
                      {col.key === "status" && row[col.key] ? (
                        <Badge className={`${getStatusColor(row[col.key])} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(row[col.key])}
                          <span className="capitalize">{row[col.key]}</span>
                        </Badge>
                      ) : col.key === "amount" || col.key === "gross" || col.key === "wht" || col.key === "vat" || col.key === "net" || col.key === "balance" ? (
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(row[col.key])}
                        </span>
                      ) : col.key === "date" && row[col.key] ? (
                        <span className="text-gray-700 dark:text-gray-300">
                          {formatDate(row[col.key])}
                        </span>
                      ) : col.key === "type" && row[col.key] ? (
                        <Badge 
                          variant="outline"
                          className={
                            row[col.key] === "Credit" 
                              ? "border-green-300 text-green-700 dark:border-green-600 dark:text-green-300" 
                              : "border-red-300 text-red-700 dark:border-red-600 dark:text-red-300"
                          }
                        >
                          {row[col.key]}
                        </Badge>
                      ) : (
                        <span className="text-gray-700 dark:text-gray-300">
                          {row[col.key] ?? "-"}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Pagination */}
      {allData.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Record Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, allData.length)} of {allData.length} {type} records
              </span>
            </div>

            {/* Summary Stats */}
            <div className="text-sm">
              {type === "commission" && (
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Total Net Commission: {allData.reduce((sum, item) => sum + (parseFloat(item.net) || 0), 0).toLocaleString()}
                </span>
              )}
              {type === "payment" && allData.length > 0 && (
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Current Balance: {formatCurrency(allData[allData.length - 1]?.balance)}
                </span>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === totalPages || 
                      Math.abs(page - currentPage) <= 1
                    )
                    .map((page, index, filteredPages) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && filteredPages[index - 1] !== page - 1 && (
                          <span className="px-2 py-1 text-sm text-gray-500">...</span>
                        )}
                        <Button
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      </div>
                    ))
                  }
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}