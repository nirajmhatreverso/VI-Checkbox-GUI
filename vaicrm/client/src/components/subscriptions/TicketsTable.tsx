import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, FileText, MessageSquare, Edit, Copy, SlidersHorizontal, X, Calendar as CalendarIcon, AlertCircle, User, CheckCircle2 } from "lucide-react";
import type { Ticket } from "@/types/subscriber";
import { DataTable, type DataTableColumn, type DataTableAction } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface TicketsTableProps {
  tickets: Ticket[];
}

// Helper types and functions for filtering
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

type TicketFilters = {
  ticketIdOrAgent: string;
  agent: string;
  status: string;
  priority: string;
  type: string;
  fromDate: string;
  toDate: string;
};

type FilterFieldKey = "ticketId" | "agent" | "status" | "priority" | "type" | "dateRange";
type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  value?: string;
  dateRange?: DateRange;
};

// Main Component
export default function TicketsTable({ tickets }: TicketsTableProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { toast } = useToast();

  const [useAdvanced, setUseAdvanced] = useState(false);
  const initialFrom = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return toYmd(d);
  }, []);
  const initialTo = useMemo(() => toYmd(new Date()), []);

  const [filters, setFilters] = useState<TicketFilters>({
    ticketIdOrAgent: "", agent: "", status: "", priority: "", type: "",
    fromDate: initialFrom, toDate: initialTo,
  });

  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(initialFrom),
    to: new Date(initialTo),
  });

  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);
  const debouncedFilters = useDebounce(filters, 500);

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const ticketDateObj = ticket.date ? new Date(ticket.date) : null;
      const isTicketDateValid = ticketDateObj && !isNaN(ticketDateObj.getTime());

      const fromDate = debouncedFilters.fromDate ? new Date(debouncedFilters.fromDate) : null;
      const toDate = debouncedFilters.toDate ? new Date(debouncedFilters.toDate) : null;
      if (toDate) toDate.setHours(23, 59, 59, 999);

      const matchesDate = !fromDate || !toDate || !isTicketDateValid || (ticketDateObj! >= fromDate && ticketDateObj! <= toDate);

      const matchesBasicSearch = !debouncedFilters.ticketIdOrAgent ||
        (ticket.ticketId && ticket.ticketId.toLowerCase().includes(debouncedFilters.ticketIdOrAgent.toLowerCase())) ||
        (ticket.agent && ticket.agent.toLowerCase().includes(debouncedFilters.ticketIdOrAgent.toLowerCase()));

      const matchesAdvancedAgent = !debouncedFilters.agent || (ticket.agent && ticket.agent.toLowerCase().includes(debouncedFilters.agent.toLowerCase()));
      const matchesStatus = !debouncedFilters.status || ticket.status === debouncedFilters.status;
      const matchesPriority = !debouncedFilters.priority || ticket.priority === debouncedFilters.priority;
      const matchesType = !debouncedFilters.type || ticket.type === debouncedFilters.type;

      if (useAdvanced) {
        return matchesDate && matchesAdvancedAgent && matchesStatus && matchesPriority && matchesType;
      }
      return matchesDate && matchesBasicSearch;
    });
  }, [tickets, debouncedFilters, useAdvanced]);

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsViewModalOpen(true);
  };

  const handleCopyTicketId = async (ticketId: string) => {
    try {
      await navigator.clipboard.writeText(ticketId);
      toast({ title: "Copied!", description: "Ticket ID copied to clipboard." });
    } catch {
      toast({ title: "Copy Failed", variant: "destructive" });
    }
  };

  const handleEditTicket = (ticket: Ticket) => {
    toast({ title: "Edit Action", description: `Editing ticket ${ticket.ticketId}` });
  };

  const handleAddComment = (ticket: Ticket) => {
    toast({ title: "Add Comment", description: `Adding comment to ticket ${ticket.ticketId}` });
  };

  const columns: DataTableColumn<Ticket>[] = [
    { key: "date", label: "Date", sortable: true, render: (_v, item) => `${item.date ?? ""} ${item.time ?? ""}` },
    { key: "ticketId", label: "Ticket ID", sortable: true, render: (v) => <span className="font-medium">{v}</span> },
    { key: "type", label: "Type", sortable: true },
    { key: "priority", label: "Priority", sortable: true, render: (v: string) => <Badge className={`text-xs ${v === "High" ? "bg-red-100 text-red-800" : v === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>{v}</Badge> },
    { key: "status", label: "Status", sortable: true, render: (v: string) => <Badge className={`text-xs ${v === "Resolved" || v === "Closed" ? "bg-green-100 text-green-800" : v === "In Progress" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>{v}</Badge> },
    { key: "agent", label: "Agent", sortable: true },
  ];

  const actions: DataTableAction<Ticket>[] = [
    { label: "View Details", icon: <Eye className="h-4 w-4" />, onClick: handleViewTicket },
    { label: "Edit Ticket", icon: <Edit className="h-4 w-4" />, onClick: handleEditTicket },
    { label: "Add Comment", icon: <MessageSquare className="h-4 w-4" />, onClick: handleAddComment },
    { label: "Copy Ticket ID", icon: <Copy className="h-4 w-4" />, onClick: (t) => handleCopyTicketId(t.ticketId) },
  ];

  const handleReset = () => {
    const resetFilters: TicketFilters = {
      ticketIdOrAgent: "", agent: "", status: "", priority: "", type: "",
      fromDate: initialFrom, toDate: initialTo,
    };
    setFilters(resetFilters);
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className=" p-4 rounded-t-lg border-b">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800">Support Tickets</CardTitle>
                <CardDescription className="text-sm text-gray-500">Track and manage customer support tickets</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={!useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>Basic</Button>
                <Button variant={useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}><SlidersHorizontal className="h-4 w-4 mr-2" />Advanced</Button>
                <Button size="sm" variant="ghost" onClick={handleReset}><X className="h-4 w-4 mr-2" />Reset Filters</Button>
              </div>
            </div>

            {!useAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-2 rounded-md bg-white/50">
                <div>
                  <LabelSmall>Ticket ID or Agent</LabelSmall>
                  <Input value={filters.ticketIdOrAgent} onChange={(e) => setFilters(f => ({ ...f, ticketIdOrAgent: e.target.value }))} placeholder="Search ID or Agent name..." className="h-7 text-xs" />
                </div>
                <div>
                  <LabelSmall>Date Range</LabelSmall>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs bg-white">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` : format(basicRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar initialFocus mode="range" defaultMonth={basicRange?.from} selected={basicRange} onSelect={(range) => {
                        setBasicRange(range);
                        setFilters(f => ({ ...f, fromDate: range?.from ? toYmd(range.from) : "", toDate: range?.to ? toYmd(range.to) : "" }));
                      }} numberOfMonths={2} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {useAdvanced && <AdvancedFiltersComponent advFilters={advFilters} setAdvFilters={setAdvFilters} setFilters={setFilters} initialFrom={initialFrom} initialTo={initialTo} tickets={tickets} />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable<Ticket>
            title="Ticket List"
            headerVariant="gradient"
            data={filteredTickets}
            columns={columns}
            actions={actions}
            showCount
            totalCount={filteredTickets.length}
            emptyMessage="No tickets found for the selected filters."
            enableExport
          />
        </CardContent>
      </Card>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-gray-100 shadow-2xl">
          {selectedTicket && (
            <div className="flex flex-col h-full">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {selectedTicket.ticketId}
                      </h2>
                      <Badge className={`px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider shadow-sm border ${selectedTicket.status === "Resolved" || selectedTicket.status === "Closed"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : selectedTicket.status === "Open"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                        }`}>
                        {selectedTicket.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                      <span className="bg-white/80 px-2 py-0.5 rounded-md border border-gray-200/50 shadow-sm text-xs">
                        {selectedTicket.type} Ticket
                      </span>
                    </p>
                  </div>
                  {/* Priority Badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${selectedTicket.priority === "Critical" || selectedTicket.priority === "High"
                    ? "bg-red-50 border-red-100 text-red-700"
                    : selectedTicket.priority === "Medium"
                      ? "bg-orange-50 border-orange-100 text-orange-700"
                      : "bg-blue-50 border-blue-100 text-blue-700"
                    }`}>
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">{selectedTicket.priority} Priority</span>
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-8">

                {/* Key Details Grid */}
                {/* Key Details Section */}
                <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket Information</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-blue-600">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Assigned Agent</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedTicket.agent || "Unassigned"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-emerald-600">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Customer ID</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedTicket.customerId || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-indigo-600">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Created Date</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {selectedTicket.date !== "N/A" ? selectedTicket.date : "Date not available"}
                          {selectedTicket.time !== "N/A" && <span className="text-gray-400 font-normal ml-1">at {selectedTicket.time}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Issue Description</h3>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60 shadow-inner text-sm text-gray-700 leading-relaxed">
                    {selectedTicket.description || "No description provided."}
                  </div>
                </div>

                {/* Resolution Section */}
                {selectedTicket.resolution && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Resolution</h3>
                    </div>
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-sm text-gray-800 leading-relaxed shadow-sm">
                      {selectedTicket.resolution}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-lg">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Ticket
                </Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-gray-700 mb-1 block">{children}</label>
);

function AdvancedFiltersComponent({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo, tickets }: { advFilters: AdvancedFilter[], setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>, setFilters: React.Dispatch<React.SetStateAction<TicketFilters>>, initialFrom: string, initialTo: string, tickets: Ticket[] }) {

  const uniquePriorities = useMemo(() => Array.from(new Set(tickets.map(t => t.priority).filter(Boolean))), [tickets]);
  const uniqueStatuses = useMemo(() => Array.from(new Set(tickets.map(t => t.status).filter(Boolean))), [tickets]);
  const uniqueTypes = useMemo(() => Array.from(new Set(tickets.map(t => t.type).filter(Boolean))), [tickets]);

  const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "daterange" | "select"; options?: string[] }[] = [
    { value: "ticketId", label: "Ticket ID", type: "text" },
    { value: "agent", label: "Agent", type: "text" },
    { value: "status", label: "Status", type: "select", options: uniqueStatuses },
    { value: "priority", label: "Priority", type: "select", options: uniquePriorities },
    { value: "type", label: "Type", type: "select", options: uniqueTypes },
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  const addAdvFilter = (field: FilterFieldKey) => {
    if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
    const newFilter: AdvancedFilter = { id: `${field}-${Date.now()}`, field, value: "", dateRange: field === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined, };
    setAdvFilters((prev) => [...prev, newFilter]);
  };

  const removeAdvFilter = (id: string) => setAdvFilters((prev) => prev.filter((f) => f.id !== id));

  useEffect(() => {
    const nextFilters: TicketFilters = { ticketIdOrAgent: "", agent: "", status: "", priority: "", type: "", fromDate: initialFrom, toDate: initialTo };
    advFilters.forEach((f) => {
      switch (f.field) {
        case "ticketId": nextFilters.ticketIdOrAgent = f.value || ""; break;
        case "agent": nextFilters.agent = f.value || ""; break;
        case "status": nextFilters.status = f.value || ""; break;
        case "priority": nextFilters.priority = f.value || ""; break;
        case "type": nextFilters.type = f.value || ""; break;
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
        <Popover>
          <PopoverTrigger asChild><Button variant="outline" className="h-7 text-xs w-56 justify-between"><span>Add filter...</span><SlidersHorizontal className="h-4 w-4" /></Button></PopoverTrigger>
          <PopoverContent className="w-56 p-0">
            <div className="py-1">
              {FILTER_FIELD_OPTIONS.map((opt) => {
                const isSelected = advFilters.some((f) => f.field === opt.value);
                return (
                  <button
                    key={opt.value}
                    disabled={isSelected}
                    className={`w-full text-left px-3 py-2 text-sm ${isSelected ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
                    onClick={() => addAdvFilter(opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
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
                {fieldMeta.type === "select" && (
                  <Select value={af.value || ""} onValueChange={(val) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: val } : x)))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={`Select ${fieldMeta.label}`} /></SelectTrigger>
                    <SelectContent>{(fieldMeta.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {fieldMeta.type === "daterange" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {af.dateRange?.from ? (af.dateRange.to ? `${format(af.dateRange.from, "LLL dd, y")} - ${format(af.dateRange.to, "LLL dd, y")}` : format(af.dateRange.from, "LLL dd, y")) : <span>Pick a range</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar initialFocus mode="range" defaultMonth={af.dateRange?.from} selected={af.dateRange} onSelect={(range) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, dateRange: range } : x)))} numberOfMonths={2} />
                    </PopoverContent>
                  </Popover>
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