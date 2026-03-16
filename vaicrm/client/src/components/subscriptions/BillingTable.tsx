import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DataTable, type DataTableColumn, type DataTableAction } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid3x3, SlidersHorizontal, X, Eye, Mail, Download, Calendar as CalendarIcon, Loader2, FileText, DollarSign, User, CreditCard } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { format, parse } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// ✅ ADDED: Props to receive IDs for data fetching
interface BillingTableProps {
  sapBpId: string;
  sapCaId: string;
}

// ✅ ADDED: Clean data structure for invoices
interface TransformedInvoice {
  contractAccount: string;
  invoiceDocumentNumber: string;
  businessPartner: string;
  billDate: Date | null;
  dueDate: Date | null;
  billAmount: number;
  currency: string;
  filename: string;
  original: any;
}

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

// ✅ ADDED: Helper to parse API date strings
const parseApiDate = (dateStr: string): Date | null => {
  if (!dateStr || dateStr.length !== 8) return null;
  try {
    return parse(dateStr, 'yyyyMMdd', new Date());
  } catch {
    return null;
  }
};

// ✅ ADDED: Expanded filter types
type BillingFilters = {
  searchTerm: string;
  contractAccount: string;
  businessPartner: string;
  fromDate: string;
  toDate: string;
};

type FilterFieldKey = "searchTerm" | "contractAccount" | "businessPartner" | "dateRange";
type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  value?: string;
  dateRange?: DateRange;
};

export default function BillingTable({ sapBpId, sapCaId }: BillingTableProps) {
  const { toast } = useToast();

  const [useAdvanced, setUseAdvanced] = useState(false);
  const initialFrom = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return toYmd(d);
  }, []);
  const initialTo = useMemo(() => toYmd(new Date()), []);

  const [filters, setFilters] = useState<BillingFilters>({
    searchTerm: "", contractAccount: "", businessPartner: "",
    fromDate: initialFrom, toDate: initialTo,
  });

  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(initialFrom), to: new Date(initialTo),
  });

  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);
  const debouncedFilters = useDebounce(filters, 500);

  // ✅ ADDED: State for transformed data
  const [billingData, setBillingData] = useState<TransformedInvoice[]>([]);

  // ✅ ADDED: State for invoice details dialog
  const [selectedInvoice, setSelectedInvoice] = useState<TransformedInvoice | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  // ✅ ADDED: useQuery to fetch live data
  const { data: rawData, isLoading, isError } = useQuery({
    queryKey: ['billingDetails', sapBpId, sapCaId],
    queryFn: () => apiRequest('/subscriptions/invoice-details', 'POST', { sapBpId, sapCaId }),
    enabled: !!sapBpId && !!sapCaId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    gcTime: 0,
  });

  // ✅ ADDED: useEffect to transform raw API data
  useEffect(() => {
    if (rawData?.status === "SUCCESS" && rawData.data?.results) {
      const transformed = rawData.data.results.map((invoice: any): TransformedInvoice => ({
        contractAccount: invoice.ContractAccount,
        invoiceDocumentNumber: invoice.InvoiceDocumentNumber,
        businessPartner: invoice.BusinessPartner,
        billDate: parseApiDate(invoice.BillDate),
        dueDate: parseApiDate(invoice.DueDate),
        billAmount: parseFloat(invoice.BillAmount) || 0,
        currency: invoice.Currency,
        filename: invoice.Filename,
        original: invoice,
      })).filter((item: TransformedInvoice) => item.billDate);
      setBillingData(transformed);
    } else {
      setBillingData([]);
    }
  }, [rawData]);

  // ✅ ADDED: Updated filtering logic for new data structure
  const filteredInvoices = useMemo(() => {
    return billingData.filter(invoice => {
      const invoiceDate = invoice.billDate;
      if (!invoiceDate) return false;
      const fromDate = new Date(debouncedFilters.fromDate);
      const toDate = new Date(debouncedFilters.toDate);
      toDate.setDate(toDate.getDate() + 1);
      const matchesDate = !isNaN(invoiceDate.getTime()) && invoiceDate >= fromDate && invoiceDate < toDate;
      const matchesSearch = !debouncedFilters.searchTerm || (invoice.invoiceDocumentNumber?.toLowerCase().includes(debouncedFilters.searchTerm.toLowerCase()));
      const matchesContractAccount = !debouncedFilters.contractAccount || (invoice.contractAccount?.toLowerCase().includes(debouncedFilters.contractAccount.toLowerCase()));
      const matchesBusinessPartner = !debouncedFilters.businessPartner || (invoice.businessPartner?.toLowerCase().includes(debouncedFilters.businessPartner.toLowerCase()));
      return matchesDate && matchesSearch && matchesContractAccount && matchesBusinessPartner;
    });
  }, [billingData, debouncedFilters]);

  // ✅ UPDATED: Open dialog instead of just toast
  const handleViewInvoice = (invoice: TransformedInvoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDialog(true);
  };

  const handleSendMail = (invoice: TransformedInvoice) => toast({ title: "Email Sent", description: `Invoice ${invoice.invoiceDocumentNumber} has been sent.` });
  const handleDownloadInvoice = async (invoice: TransformedInvoice) => {
    toast({ title: "Download Started", description: `Downloading invoice ${invoice.invoiceDocumentNumber}...` });
    try {
      const response = await apiRequest('/subscriptions/download-invoice', 'POST', {
        fileName: invoice.filename,
        filePath: invoice.original.Filepath || ""
      });

      if (response instanceof Response) {
        if (!response.ok) throw new Error("Download failed");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = invoice.filename || `Invoice-${invoice.invoiceDocumentNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({ title: "Download Complete", description: `Invoice ${invoice.invoiceDocumentNumber} downloaded successfully.` });
      } else {
        // If apiRequest returns parsed JSON (it shouldn't for binary unless error), handle it
        throw new Error("Invalid response format");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Download Failed", description: "Failed to download invoice. Please try again." });
    }
  };

  // ✅ ADDED: Updated columns for new data structure
  const columns: DataTableColumn<TransformedInvoice>[] = [
    { key: "contractAccount", label: "Contract Account", sortable: true },
    { key: "invoiceDocumentNumber", label: "Invoice #", sortable: true, render: (v) => v || "-" },
    { key: "businessPartner", label: "Business Partner", sortable: true },
    { key: "billDate", label: "Bill Date", sortable: true, render: (v: Date | null) => (v ? v.toLocaleDateString() : "-") },
    { key: "dueDate", label: "Due Date", sortable: true, render: (v: Date | null) => (v ? v.toLocaleDateString() : "-") },
    { key: "billAmount", label: "Amount", sortable: true, render: (v, row) => <span className="font-medium">{row.currency} {Number(v ?? 0).toLocaleString()}</span> },
    { key: "filename", label: "Filename", sortable: false, render: (v) => v || "-" },
  ];

  const actions: DataTableAction<TransformedInvoice>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: handleViewInvoice },
    // { label: "Send Mail", icon: <Mail className="h-4 w-4" />, onClick: handleSendMail },
    { label: "Download", icon: <Download className="h-4 w-4" />, onClick: handleDownloadInvoice },
  ];

  const handleReset = () => {
    setFilters({ searchTerm: "", contractAccount: "", businessPartner: "", fromDate: initialFrom, toDate: initialTo });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
  };

  if (isLoading) {
    return <Card><CardContent className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-azam-blue" /> <p className="ml-2">Loading Billing Info...</p></CardContent></Card>
  }

  if (isError) {
    return <Card><CardContent className="h-64 flex items-center justify-center text-red-600">No billing information found</CardContent></Card>
  }

  return (
    <>
      <Card>
        <CardHeader className="p-4 rounded-t-lg border-b">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-lg font-semibold text-gray-800"><Grid3x3 className="h-5 w-5 mr-2" />Billing</CardTitle>
                <CardDescription>View and manage customer invoices.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={!useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>Basic</Button>
                <Button variant={useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}><SlidersHorizontal className="h-4 w-4 mr-2" />Advanced</Button>
                <Button size="sm" variant="ghost" onClick={handleReset}><X className="h-4 w-4 mr-2" />Reset</Button>
              </div>
            </div>

            {!useAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-2 rounded-md bg-white/50">
                <div><LabelSmall>Search by Invoice #</LabelSmall><Input value={filters.searchTerm} onChange={(e) => setFilters(f => ({ ...f, searchTerm: e.target.value }))} placeholder="Invoice #" className="h-7 text-xs" /></div>
                <div><LabelSmall>Bill Date Range</LabelSmall><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs bg-white"><CalendarIcon className="mr-2 h-4 w-4" />{basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` : format(basicRange.from, "LLL dd, y")) : <span>Pick a date range</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={basicRange?.from} selected={basicRange} onSelect={(range) => { setBasicRange(range); setFilters(f => ({ ...f, fromDate: range?.from ? toYmd(range.from) : "", toDate: range?.to ? toYmd(range.to) : "" })); }} numberOfMonths={2} /></PopoverContent></Popover></div>
              </div>
            )}

            {useAdvanced && <AdvancedFiltersComponent advFilters={advFilters} setAdvFilters={setAdvFilters} setFilters={setFilters} initialFrom={initialFrom} initialTo={initialTo} />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable<TransformedInvoice>
            title="Invoice List" headerVariant="gradient" data={filteredInvoices} columns={columns} actions={actions}
            showCount totalCount={filteredInvoices.length} emptyMessage={billingData.length === 0 ? "No billing records found for this customer." : "No records match your criteria."} enableExport
          />
        </CardContent>
      </Card>

      {/* ✅ ADDED: Invoice Detail Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-azam-blue" />
              Invoice Details
            </DialogTitle>
            <DialogDescription>
              Viewing details for invoice #{selectedInvoice?.invoiceDocumentNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="grid gap-6 py-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">
                      {selectedInvoice.billAmount.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-gray-600">{selectedInvoice.currency}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                  <p className={`text-lg font-semibold ${selectedInvoice.dueDate && selectedInvoice.dueDate < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                    {selectedInvoice.dueDate?.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" /> Business Partner
                  </div>
                  <p className="font-medium pl-6">{selectedInvoice.businessPartner}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" /> Contract Account
                  </div>
                  <p className="font-medium pl-6">{selectedInvoice.contractAccount}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" /> Bill Date
                  </div>
                  <p className="font-medium pl-6">{selectedInvoice.billDate?.toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" /> Filename
                  </div>
                  <p className="font-medium pl-6 truncate text-xs" title={selectedInvoice.filename}>{selectedInvoice.filename || "N/A"}</p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button onClick={() => handleDownloadInvoice(selectedInvoice)}>
                  <Download className="h-4 w-4 mr-2" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-gray-700 mb-1 block">{children}</label>
);

function AdvancedFiltersComponent({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo }: { advFilters: AdvancedFilter[], setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>, setFilters: React.Dispatch<React.SetStateAction<BillingFilters>>, initialFrom: string, initialTo: string }) {

  // ✅ ADDED: Updated advanced filter options
  const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "daterange" }[] = [
    { value: "searchTerm", label: "Invoice #", type: "text" },
    { value: "contractAccount", label: "Contract Account", type: "text" },
    { value: "businessPartner", label: "Business Partner", type: "text" },
    { value: "dateRange", label: "Bill Date Range", type: "daterange" },
  ];

  const addAdvFilter = (field: FilterFieldKey) => {
    if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
    const newFilter: AdvancedFilter = { id: `${field}-${Date.now()}`, field, value: "", dateRange: field === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined };
    setAdvFilters((prev) => [...prev, newFilter]);
  };

  const removeAdvFilter = (id: string) => setAdvFilters((prev) => prev.filter((f) => f.id !== id));

  // ✅ ADDED: useEffect to handle new filter fields
  useEffect(() => {
    const nextFilters: BillingFilters = { searchTerm: "", contractAccount: "", businessPartner: "", fromDate: initialFrom, toDate: initialTo };
    advFilters.forEach((f) => {
      switch (f.field) {
        case "searchTerm": nextFilters.searchTerm = f.value || ""; break;
        case "contractAccount": nextFilters.contractAccount = f.value || ""; break;
        case "businessPartner": nextFilters.businessPartner = f.value || ""; break;
        case "dateRange":
          if (f.dateRange?.from) {
            nextFilters.fromDate = toYmd(f.dateRange.from);
            nextFilters.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
          }
          break;
      }
    });
    setFilters(nextFilters);
  }, [advFilters, setFilters, initialFrom, initialTo]);

  return (
    <div className="space-y-3 border p-3 rounded-md bg-white/50">
      <div className="flex items-center gap-2">
        <LabelSmall>Add filter</LabelSmall>
        <Popover><PopoverTrigger asChild><Button variant="outline" className="h-7 text-xs w-56 justify-between"><span>Add filter...</span><SlidersHorizontal className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-56 p-0"><div className="py-1">{FILTER_FIELD_OPTIONS.map((opt) => (<button key={opt.value} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => addAdvFilter(opt.value)}>{opt.label}</button>))}</div></PopoverContent></Popover>
      </div>
      <div className="space-y-2">
        {advFilters.length === 0 && (<div className="text-xs text-muted-foreground">No advanced filters added.</div>)}
        {advFilters.map((af) => {
          const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field)!;
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3"><Input value={fieldMeta.label} readOnly className="h-7 text-xs bg-gray-50" /></div>
              <div className="col-span-8">
                {fieldMeta.type === "text" && (<Input className="h-7 text-xs" value={af.value || ""} onChange={(e) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: e.target.value } : x)))} placeholder={`Enter ${fieldMeta.label}...`} />)}
                {fieldMeta.type === "daterange" && (
                  <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs"><CalendarIcon className="mr-2 h-4 w-4" />{af.dateRange?.from ? (af.dateRange.to ? `${format(af.dateRange.from, "LLL dd, y")} - ${format(af.dateRange.to, "LLL dd, y")}` : format(af.dateRange.from, "LLL dd, y")) : <span>Pick a range</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={af.dateRange?.from} selected={af.dateRange} onSelect={(range) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, dateRange: range } : x)))} numberOfMonths={2} /></PopoverContent></Popover>
                )}
              </div>
              <div className="col-span-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAdvFilter(af.id)}><X className="h-4 w-4 text-red-500" /></Button></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}