// src/components/subscriptions/LedgerTable.tsx (Corrected & Upgraded)

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FileText, SlidersHorizontal, X, TrendingUp, ArrowUpDown, Wallet, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

// ✅ ADDED: Props to receive IDs for data fetching
interface LedgerTableProps {
  sapBpId: string;
  sapCaId: string;
}

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

// ✅ ADDED: Expanded filter and data types from reference
type LedgerFilters = {
  searchTerm: string;
  fromDate: string;
  toDate: string;
};

type FilterFieldKey = "searchTerm" | "dateRange";
type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  value?: string;
  dateRange?: DateRange;
};

interface TransformedLedgerEntry {
  seqNo: string;
  documentNo: string;
  glAccount: string;
  debit: number;
  credit: number;
  reference: string;
  description: string;
  companyCode: string;
  division: string;
  docDate: string | null;
  postDate: string | null;
  clDocNo: string;
}

const formatDateString = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return dateStr;
    }
}

export default function LedgerTable({ sapBpId, sapCaId }: LedgerTableProps) {
  const [useAdvanced, setUseAdvanced] = useState(false);
  const initialFrom = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return toYmd(d);
  }, []);
  const initialTo = useMemo(() => toYmd(new Date()), []);
  
  const [filters, setFilters] = useState<LedgerFilters>({
    searchTerm: "", fromDate: initialFrom, toDate: initialTo,
  });
  
  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(initialFrom), to: new Date(initialTo),
  });

  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);
  const debouncedFilters = useDebounce(filters, 500);
  
  // ✅ ADDED: State for transformed data and summary
  const [ledgerData, setLedgerData] = useState<TransformedLedgerEntry[]>([]);
  const [summary, setSummary] = useState({ openItems: 0, clearing: 0, finalBalance: 0, currency: '' });

  // ✅ ADDED: useQuery to fetch live data
  const { data: rawData, isLoading, isError } = useQuery({
    queryKey: ['ledgerDetails', sapBpId, sapCaId],
    queryFn: () => apiRequest('/subscriptions/ledger-details', 'POST', { sapBpId, sapCaId }),
    enabled: !!sapBpId && !!sapCaId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    gcTime: 0,
  });

  // ✅ ADDED: useEffect to transform raw API data and update summary
  useEffect(() => {
    if (rawData?.status === "SUCCESS" && rawData.data?.results) {
      const results = rawData.data.results;
      
      if (results.length > 0) {
        const firstRecord = results[0];
        setSummary({
          openItems: parseFloat(firstRecord.OSumOpenitems) || 0,
          clearing: parseFloat(firstRecord.OSumClearings) || 0,
          finalBalance: parseFloat(firstRecord.OBalance) || 0,
          currency: firstRecord.CurrKey || ''
        });
      } else {
        setSummary({ openItems: 0, clearing: 0, finalBalance: 0, currency: '' });
      }

      const transformed = results.map((item: any): TransformedLedgerEntry => {
        const amount = parseFloat(item.Amount) || 0;
        return {
          seqNo: item.SeqNo,
          documentNo: item.DocNo,
          glAccount: item.GlAccount,
          debit: amount > 0 ? amount : 0,
          credit: amount < 0 ? Math.abs(amount) : 0,
          reference: item.RefDocNo,
          description: item.Btext,
          companyCode: item.CompanyCode,
          division: item.Division,
          docDate: item.DocDate,
          postDate: item.PostDate,
          clDocNo: item.ClDocNo,
        };
      }).sort((a: { seqNo: string; }, b: { seqNo: string; }) => parseInt(b.seqNo, 10) - parseInt(a.seqNo, 10));
      setLedgerData(transformed);
    }
  }, [rawData]);

  // ✅ ADDED: Updated filtering logic for new data structure
  const filteredLedgerData = useMemo(() => {
    if (ledgerData.length === 0) return [];
    return ledgerData.filter(item => {
        const fromDate = new Date(debouncedFilters.fromDate);
        const toDate = new Date(debouncedFilters.toDate);
        toDate.setDate(toDate.getDate() + 1);
        let matchesDate = true;
        const itemDate = item.postDate ? new Date(item.postDate) : item.docDate ? new Date(item.docDate) : null;
        if (itemDate && !isNaN(itemDate.getTime())) {
            matchesDate = itemDate >= fromDate && itemDate < toDate;
        } else if (debouncedFilters.fromDate !== initialFrom || debouncedFilters.toDate !== initialTo) {
            matchesDate = false;
        }
        const matchesSearch = !debouncedFilters.searchTerm ||
            (item.description?.toLowerCase().includes(debouncedFilters.searchTerm.toLowerCase())) ||
            (item.reference?.toLowerCase().includes(debouncedFilters.searchTerm.toLowerCase()));
        return matchesDate && matchesSearch;
    });
  }, [ledgerData, debouncedFilters, initialFrom, initialTo]);
  
  // ✅ ADDED: Updated columns for new data structure
  const columns: DataTableColumn<TransformedLedgerEntry>[] = [
    { key: "seqNo", label: "Seq#", sortable: true },
    { key: "documentNo", label: "Document No", sortable: true },
    { key: "glAccount", label: "GL", sortable: true },
    { key: "debit", label: "Debit", sortable: true, render: (v: number) => v > 0 ? <span className="font-medium text-red-600">{v.toLocaleString()}</span> : "-" },
    { key: "credit", label: "Credit", sortable: true, render: (v: number) => v > 0 ? <span className="font-medium text-green-600">{v.toLocaleString()}</span> : "-" },
    { key: "reference", label: "Reference", sortable: true, render: (v: string) => <span className="text-xs text-gray-500">{v}</span> },
    { key: "description", label: "Description", sortable: false },
    { key: "companyCode", label: "Co. Code", sortable: true },
    { key: "division", label: "Division", sortable: true },
    { key: "docDate", label: "Doc Date", sortable: true, render: (v) => formatDateString(v) },
    { key: "postDate", label: "Posting Date", sortable: true, render: (v) => formatDateString(v) },
    { key: "clDocNo", label: "Cl.Doc.No", sortable: true },
  ];

  const handleReset = () => {
    setFilters({ searchTerm: "", fromDate: initialFrom, toDate: initialTo });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
  };
  
  // ✅ ADDED: Loading and Error states
  if (isLoading) {
    return <Card><CardContent className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-azam-blue" /> <p className="ml-2">Loading Ledger...</p></CardContent></Card>
  }
  if (isError) {
      return <Card><CardContent className="h-64 flex items-center justify-center text-red-600">No Ledger Details Found</CardContent></Card>
  }

  return (
    <Card className="bg-white shadow-sm border-gray-200">
      <CardHeader className="p-4">
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="flex items-center text-lg font-semibold text-gray-800"><FileText className="h-5 w-5 mr-2" />Account Ledger</CardTitle>
                    <CardDescription>View detailed transaction history and account balance movements</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant={!useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>Basic</Button>
                    <Button variant={useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}><SlidersHorizontal className="h-4 w-4 mr-2" />Advanced</Button>
                    <Button size="sm" variant="ghost" onClick={handleReset}><X className="h-4 w-4 mr-2" />Reset</Button>
                </div>
            </div>

            {!useAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-2 rounded-md bg-gray-50">
                    <div>
                        <LabelSmall>Search</LabelSmall>
                        <Input value={filters.searchTerm} onChange={(e) => setFilters(f => ({ ...f, searchTerm: e.target.value }))} placeholder="Description or Reference..." className="h-7 text-xs" />
                    </div>
                    <div>
                        <LabelSmall>Date Range</LabelSmall>
                        <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs bg-white"><CalendarIcon className="mr-2 h-4 w-4" />{basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` : format(basicRange.from, "LLL dd, y")) : <span>Pick a date range</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={basicRange?.from} selected={basicRange} onSelect={(range) => { setBasicRange(range); setFilters(f => ({...f, fromDate: range?.from ? toYmd(range.from) : "", toDate: range?.to ? toYmd(range.to) : "" })); }} numberOfMonths={2} /></PopoverContent></Popover>
                    </div>
                </div>
            )}
            
            {useAdvanced && <AdvancedLedgerFilters advFilters={advFilters} setAdvFilters={setAdvFilters} setFilters={setFilters} initialFrom={initialFrom} initialTo={initialTo} />}
        </div>
      </CardHeader>
      <CardContent>
        {/* ✅ ADDED: Dynamic summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="border-orange-200 bg-orange-50"><CardContent className="pt-4 flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><TrendingUp className="h-4 w-4 text-orange-600" /></div><div><p className="text-sm font-medium">Open Items</p><p className="text-lg font-bold">{summary.currency} {summary.openItems.toLocaleString()}</p></div></CardContent></Card>
            <Card className="border-gray-200 bg-gray-50"><CardContent className="pt-4 flex items-center gap-3"><div className="p-2 bg-gray-100 rounded-lg"><ArrowUpDown className="h-4 w-4 text-gray-600" /></div><div><p className="text-sm font-medium">Clearing</p><p className="text-lg font-bold">{summary.currency} {summary.clearing.toLocaleString()}</p></div></CardContent></Card>
            <Card className="border-blue-200 bg-blue-50"><CardContent className="pt-4 flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Wallet className="h-4 w-4 text-blue-600" /></div><div><p className="text-sm font-medium">Final Balance</p><p className="text-lg font-bold">{summary.currency} {summary.finalBalance.toLocaleString()}</p></div></CardContent></Card>
        </div>
        <DataTable<TransformedLedgerEntry>
            title="Ledger Entries" headerVariant="gradient" data={filteredLedgerData} columns={columns} showCount totalCount={filteredLedgerData.length}
            emptyMessage={ledgerData.length === 0 ? "No ledger entries found for this customer." : "No transactions match your criteria."} enableExport
        />
      </CardContent>
    </Card>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-gray-700 mb-1 block">{children}</label>
);

function AdvancedLedgerFilters({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo }: { advFilters: AdvancedFilter[], setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>, setFilters: React.Dispatch<React.SetStateAction<LedgerFilters>>, initialFrom: string, initialTo: string }) {
    
    // ✅ ADDED: Simplified advanced filter options
    const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "daterange" }[] = [
        { value: "searchTerm", label: "Search Term", type: "text" },
        { value: "dateRange", label: "Date Range", type: "daterange" },
    ];

    const addAdvFilter = (field: FilterFieldKey) => {
        if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
        const newFilter: AdvancedFilter = { id: `${field}-${Date.now()}`, field, value: "", dateRange: field === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined, };
        setAdvFilters((prev) => [...prev, newFilter]);
    };

    const removeAdvFilter = (id: string) => setAdvFilters((prev) => prev.filter((f) => f.id !== id));

    // ✅ ADDED: Updated useEffect for simplified filters
    useEffect(() => {
        const nextFilters: LedgerFilters = { searchTerm: "", fromDate: initialFrom, toDate: initialTo };
        advFilters.forEach((f) => {
            switch (f.field) {
                case "searchTerm": nextFilters.searchTerm = f.value || ""; break;
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
                                {fieldMeta.type === "text" && (<Input className="h-7 text-xs" value={af.value || ""} onChange={(e) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: e.target.value } : x)))} placeholder="Enter value..." />)}
                                {fieldMeta.type === "daterange" && (
                                    <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs"><CalendarIcon className="mr-2 h-4 w-4" />{af.dateRange?.from ? (af.dateRange.to ? `${format(af.dateRange.from, "LLL dd, y")} - ${format(af.dateRange.to,"LLL dd, y")}` : format(af.dateRange.from, "LLL dd, y")) : <span>Pick a range</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={af.dateRange?.from} selected={af.dateRange} onSelect={(range) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, dateRange: range } : x)))} numberOfMonths={2} /></PopoverContent></Popover>
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