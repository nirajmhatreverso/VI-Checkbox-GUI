import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw, Download, Search as SearchIcon, Eye, FileText, Loader2,Lock  } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuthContext } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";

interface Incident {
  id: number;
  incidentNumber: string;
  client: string;
  category: string;
  subCategory: string;
  priority: string;
  status: string;
  shortDescription: string;
  assignmentGroup: string;
  assignedTo: string;
  openedBy: string;
  opened: string;
  targetResolveDate: string;
  userId: string;
  configurationItem: string;
  channel: string;
  resolvedAt?: string;
  sla?: string;
  location?: string;
  agreedContact?: string;
  // Extended fields
  landingPageNumber?: string;
  internalCase?: number;
  phoneNum?: string;
  altPhoneNum?: string;
  incidentContact?: string;
  altContact?: string;
  agentId?: string;
  agentPhone?: string;
  altLocation?: string;
  caseHistory?: string;
  assetRefNumber?: string;
  assetType?: string;
  assetTag?: string;
  assetNumber?: string;
  assetDescription?: string;
  slaColor?: string;
  survey?: number;
  commonFault?: string;
  warranty?: string;
  repairType?: string;
  agreedAgentDate?: string;
  strikesLevel?: number;
  isSupercase?: number;
  incidentSeverity?: string;
}

interface UserQueue {
  queueId: number;
  title: string;
  status: number;
  emailId: string;
  description: string;
  assignedUser: string;
  businessOrgName: string | null;
}

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString();
};

export default function Incidents() {
  const [, navigate] = useLocation();
  const { user } = useAuthContext();
const { toast } = useToast();
  // Toolbar state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedQueueId, setSelectedQueueId] = useState<string>(""); // Queue filter

  // View Modal State
  const [selectedTicket, setSelectedTicket] = useState<Incident | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // 1. Fetch User Queues on Page Load
  const { data: userQueuesData, isLoading: isLoadingQueues } = useQuery({
    queryKey: ['user-queues', user?.username],
    queryFn: async () => {
      const response = await apiRequest('/itsm/user-queues', 'POST', {
        userName: user?.username || '',
        queueName: ''
      });
      return response;
    },
    enabled: !!user?.username,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
const isStatusClosed = (status: string): boolean => {
  const normalizedStatus = (status || '').toUpperCase().trim();
  return normalizedStatus === 'CLOSED' || normalizedStatus === 'RESOLVED' || normalizedStatus === 'CANCELLED';
};
  // Process and deduplicate user queues
  const userQueues = useMemo(() => {
    const queueData = userQueuesData?.data?.data || [];
    // Deduplicate by queueId
    const uniqueMap = new Map<number, UserQueue>();
    queueData.forEach((queue: UserQueue) => {
      if (queue.queueId && !uniqueMap.has(queue.queueId)) {
        uniqueMap.set(queue.queueId, queue);
      }
    });
    return Array.from(uniqueMap.values());
  }, [userQueuesData]);

  // Auto-select first queue when queues are loaded
  useEffect(() => {
    if (userQueues.length > 0 && !selectedQueueId) {
      setSelectedQueueId(String(userQueues[0].queueId));
    }
  }, [userQueues, selectedQueueId]);

  // 2. Fetch Incidents based on Selected Queue
  const { data: incidentsData, isLoading, refetch } = useQuery({
    queryKey: ['incidents-list', selectedQueueId],
    queryFn: async () => {
      const payload: any = {
        objId: null,
        title: null,
        idNumber: null,
        incidentReporter2customer: null,
        incidentPrevq2queue: "",
        incidentCurrq2queue: selectedQueueId || "",
        incidentFirstq2queue: "",
        incidentOwner2user: "",
        incidentOriginator2user: "",
        incidentOnbehalf2user: null
      };

      const response = await apiRequest('/organization/tickets/fetch', 'POST', payload);
      return response;
    },
    enabled: !!selectedQueueId, // Only fetch when a queue is selected
  });

  // Helpers
  function getPriorityLabel(p: number | string) {
    if (typeof p === 'string') return p;
    const map: Record<number, string> = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };
    return map[Number(p)] || String(p);
  }

  function getStatusLabel(s: number | string) {
    if (typeof s === 'string') return s.toUpperCase();
    const map: Record<number, string> = { 1: 'OPEN', 2: 'IN PROGRESS', 3: 'RESOLVED', 4: 'CLOSED', 5: 'CANCELLED' };
    return map[Number(s)] || String(s);
  }

  // Helper Mappers
  const mapApiToIncident = (item: any): Incident => ({
    id: item.objId,
    incidentNumber: item.idNumber || String(item.objId || ""),
    client: item.incidentClient || item.incidentReporter2customerName || (item.incidentReporter2customer ? String(item.incidentReporter2customer) : (item.incidentReporter2busOrg ? String(item.incidentReporter2busOrg) : "-")),
    category: item.incidentCategoryName || item.incidentCatagory || "-",
    subCategory: item.incidentSubCategoryName || item.incidentSubcatagory || "-",
    priority: getPriorityLabel(item.incidentPriority),
    status: getStatusLabel(item.incidentStatus),
    shortDescription: item.title || "-",
    assignmentGroup: item.assignmentGroup || item.currentQueueName || String(item.incidentCurrq2queue || "-"),
    assignedTo: item.incidentOwner2userName || String(item.incidentOwner2user || "-"),
    openedBy: item.incidentReporter2userName || item.incidentOriginator2userName || String(item.incidentReporter2user || "-"),
    opened: item.createTs || item.createDt,
    targetResolveDate: item.targetResolveTs || item.targetResolveDt,
    userId: item.incidentReporter2customer || String(item.incidentOriginator2user || "-"),
    configurationItem: item.assetRefNumber || "",
    channel: String(item.incidentChannel || ""),
    sla: item.sla || item.slaColor || "-",
    location: item.incidentLocation || item.altLocation || "-",
    agreedContact: item.agreedContactDate || "-",
    // Extended fields
    landingPageNumber: item.landingPageNumber,
    internalCase: item.internalCase,
    phoneNum: item.phoneNum,
    altPhoneNum: item.altPhoneNum,
    incidentContact: item.incidentContact,
    altContact: item.altContact,
    agentId: item.agentId,
    agentPhone: item.agentPhone,
    altLocation: item.altLocation,
    caseHistory: item.caseHistory,
    assetRefNumber: item.assetRefNumber,
    assetType: item.assetType,
    assetTag: item.assetTag,
    assetNumber: item.assetNumber,
    assetDescription: item.assetDescription,
    slaColor: item.sla || item.slaColor,
    survey: item.survey,
    commonFault: item.commonFault,
    warranty: item.warranty,
    repairType: item.repairType,
    agreedAgentDate: item.agreedAgentDate,
    strikesLevel: item.strikesLevel,
    isSupercase: item.isSupercase,
    incidentSeverity: item.incidentSeverity
  });

  const incidents: Incident[] = useMemo(() => {
    if (!incidentsData?.data?.data) return [];
    return incidentsData.data.data.map(mapApiToIncident);
  }, [incidentsData]);

  // Fetch Single Ticket Details Query
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['incident-detail', selectedTicket?.incidentNumber],
    queryFn: async () => {
      if (!selectedTicket?.incidentNumber) return null;
      const response = await apiRequest('/organization/tickets/fetch', 'POST', {
        objId: null,
        title: null,
        idNumber: selectedTicket.incidentNumber,
        incidentReporter2customer: null,
        incidentPrevq2queue: "",
        incidentCurrq2queue: "",
        incidentFirstq2queue: "",
        incidentOwner2user: "",
        incidentOriginator2user: "",
        incidentOnbehalf2user: null
      });
      return response;
    },
    enabled: !!selectedTicket?.incidentNumber && isViewOpen
  });

  const displayTicket = useMemo(() => {
    if (detailData?.data?.data?.[0]) {
      return mapApiToIncident(detailData.data.data[0]);
    }
    return selectedTicket;
  }, [detailData, selectedTicket]);

  const uniqueStatuses = useMemo(
    () => Array.from(new Set(incidents.map((i) => i.status).filter(Boolean))),
    [incidents]
  );
  const uniquePriorities = useMemo(
    () => Array.from(new Set(incidents.map((i) => i.priority).filter(Boolean))),
    [incidents]
  );

  const searchableFields = [
    "incidentNumber",
    "shortDescription",
    "client",
    "assignedTo",
    "status",
    "priority",
    "category",
    "userId",
    "configurationItem",
    "channel",
  ] as const;

  const filteredIncidents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let rows = incidents.slice();

    if (term) {
      rows = rows.filter((r) =>
        searchableFields.some((f) => String((r as any)[f] ?? "").toLowerCase().includes(term))
      );
    }
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (priorityFilter !== "all") rows = rows.filter((r) => r.priority === priorityFilter);

    return rows;
  }, [incidents, searchTerm, statusFilter, priorityFilter]);

  // Columns
  const columns: DataTableColumn<Incident>[] = [
    {
  key: "incidentNumber",
  label: "ID Number",
  sortable: true,
  render: (value, item) => {
    const isClosed = isStatusClosed(item.status);
    
    if (isClosed) {
      return (
        <div className="flex items-center gap-1">
          <span
            className="font-medium text-gray-500 whitespace-nowrap cursor-not-allowed"
            title="This incident is closed and cannot be edited"
          >
            {value}
          </span>
          <Lock className="h-3 w-3 text-gray-400" />
        </div>
      );
    }
    
    return (
      <button
        onClick={() => navigate(`/view-incident/${item.incidentNumber}`)}
        className="font-medium text-blue-900 whitespace-nowrap hover:text-blue-700 hover:underline cursor-pointer transition-colors"
        data-testid={`incident-id-${item.id}`}
      >
        {value}
      </button>
    );
  },
},
    {
      key: "shortDescription",
      label: "Title",
      sortable: true,
      render: (value) => {
        const fullText = value || "";
        const isLong = fullText.length > 25;
        const displayText = isLong ? fullText.slice(0, 25) + "..." : fullText;

        return (
          <div className="flex items-center gap-1 max-w-[180px]">
            <span className="text-sm text-gray-900 truncate" title={fullText}>
              {displayText}
            </span>
            {isLong && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="xs" className="h-5 px-1.5 text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-sm">
                    More
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 text-sm break-words bg-white shadow-lg border-gray-200">
                  <p className="font-semibold mb-1 text-xs text-gray-500">Full Title</p>
                  {fullText}
                </PopoverContent>
              </Popover>
            )}
          </div>
        );
      },
    },
    {
      key: "opened",
      label: "Created On",
      sortable: true,
      render: (value) => <span className="text-sm text-gray-900 whitespace-nowrap">{formatDate(value)}</span>,
    },
    {
      key: "openedBy",
      label: "Opened By",
      sortable: true,
      render: (value) => <span className="text-sm text-gray-900 whitespace-nowrap">{value}</span>,
    },
    {
      key: "assignmentGroup",
      label: "Assignment Group",
      sortable: true,
      render: (value) => <span className="text-sm text-gray-900 whitespace-nowrap">{value}</span>,
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      sortable: true,
      render: (value) => <span className="text-sm text-gray-900 whitespace-nowrap">{value}</span>,
    },
    {
      key: "targetResolveDate",
      label: "Target Date",
      sortable: true,
      render: (value) => <span className="text-sm text-gray-900 whitespace-nowrap">{formatDate(value)}</span>,
    },
    {
      key: "location",
      label: "Location",
      sortable: true,
      render: (value) => <span className="text-sm text-gray-900 whitespace-nowrap">{value}</span>,
    },
    {
      key: "configurationItem",
      label: "Asset/Device",
      sortable: true,
      render: (value) => <span className="text-sm text-gray-900 whitespace-nowrap">{value}</span>,
    },
    {
  key: "status",
  label: "Status",
  sortable: true,
  render: (value) => {
    const isClosed = isStatusClosed(value);
    return (
      <span className={`text-sm whitespace-nowrap ${isClosed ? 'text-gray-500' : 'text-gray-900'}`}>
        {value}
        {isClosed && <Lock className="h-3 w-3 inline ml-1 text-gray-400" />}
      </span>
    );
  },
},
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (value) => <span className="text-sm text-gray-900 whitespace-nowrap">{value}</span>,
    },
    {
      key: "slaColor",
      label: "SLA",
      sortable: true,
      render: (value) => {
        const color = (value || "").toUpperCase();
        let dotClass = "bg-gray-300"; // Default

        if (color === 'RED') dotClass = "bg-red-500";
        else if (color === 'YELLOW') dotClass = "bg-yellow-500";
        else if (color === 'ORANGE') dotClass = "bg-orange-500";
        else if (color === 'GREEN') dotClass = "bg-green-500";
        else if (color === 'GREY') dotClass = "bg-gray-400";

        return (
          <div className="flex items-center pl-4">
            <div
              className={`h-3 w-3 rounded-full ${dotClass}`}
              title={color || "No SLA Color"}
            />
          </div>
        );
      },
    },
    {
  key: "id",
  label: "Actions",
  sortable: false,
  render: (_, item) => {
    const isClosed = isStatusClosed(item.status);
    
    return (
      <div className="flex items-center gap-1">
        {/* View Details Button - Always available */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTicket(item);
            setIsViewOpen(true);
          }}
          title="View Details"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">View Details</span>
        </Button>
        
        {/* Edit Button - Disabled for closed */}
        {!isClosed ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/view-incident/${item.incidentNumber}`);
            }}
            title="Edit Incident"
          >
            <FileText className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-300 cursor-not-allowed"
            disabled
            title="Cannot edit closed incident"
          >
            <Lock className="h-4 w-4" />
            <span className="sr-only">Locked</span>
          </Button>
        )}
      </div>
    );
  },
},
  ];

  const handleRefresh = () => refetch();

  const handleQueueChange = (queueId: string) => {
    setSelectedQueueId(queueId);
    // Reset other filters when queue changes
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
  };

  const exportCsv = () => {
    const headers = [
      "incidentNumber", "shortDescription", "client", "category",
      "subCategory", "priority", "status", "openedBy",
      "assignedTo", "assignmentGroup", "opened", "targetResolveDate",
      "sla", "location", "agreedContact"
    ];
    const safe = (val: any) => {
      const s = val == null ? "" : String(val);
      const escaped = s.replace(/"/g, '""');
      return `"${escaped}"`;
    };
    const csvRows = [
      headers.join(","),
      ...filteredIncidents.map((r) =>
        headers.map((h) =>
          h === "opened" || h === "targetResolveDate" ? safe(formatDate((r as any)[h])) : safe((r as any)[h])
        ).join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `group_tickets_${selectedQueueId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const DetailRow = ({ label, value }: { label: string; value: string | undefined }) => (
    <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 col-span-2 font-medium break-words">{value || "-"}</span>
    </div>
  );

  // Get selected queue title for display
  const selectedQueueTitle = useMemo(() => {
    const queue = userQueues.find(q => String(q.queueId) === selectedQueueId);
    return queue?.title || '';
  }, [userQueues, selectedQueueId]);

  // Check if still loading initial data
  const isInitialLoading = isLoadingQueues || (userQueues.length > 0 && !selectedQueueId);

  return (
    <>
      <div className="p-4 sm:p-6 w-full">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-azam-blue" />
                  My Group Incidents
                </CardTitle>
                <CardDescription>
                  {isInitialLoading 
                    ? 'Loading queues...'
                    : selectedQueueTitle 
                      ? `Viewing incidents for: ${selectedQueueTitle}` 
                      : 'No queues available'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={!selectedQueueId || isLoading}
                  className="h-8"
                >
                  <RotateCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCsv}
                  disabled={filteredIncidents.length === 0}
                  className="h-8"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Queue Selection and Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border p-2 rounded-md bg-gray-50/50">
              {/* Queue Dropdown - Primary Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Select Queue
                </label>
                <Select value={selectedQueueId} onValueChange={handleQueueChange} disabled={isLoadingQueues}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder={isLoadingQueues ? "Loading queues..." : "Select a queue"} />
                  </SelectTrigger>
                  <SelectContent>
                    {userQueues.map((queue) => (
                      <SelectItem key={queue.queueId} value={String(queue.queueId)} className="text-xs">
                        {queue.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingQueues && (
                  <div className="flex items-center gap-1 mt-1">
                    <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-500">Loading queues...</span>
                  </div>
                )}
              </div>

              {/* Search */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Search Keywords</label>
                <div className="relative">
                  <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search tickets..."
                    className="pl-8 h-8 text-xs bg-white"
                    disabled={!selectedQueueId}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter} disabled={!selectedQueueId}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter} disabled={!selectedQueueId}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {uniquePriorities.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Initial Loading State */}
            {isInitialLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Loader2 className="h-8 w-8 mb-4 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Loading your queues...</p>
              </div>
            )}

            {/* No Queues Available Message */}
            {!isLoadingQueues && userQueues.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mb-4 text-gray-300" />
                <p className="text-sm font-medium">No queues available</p>
                <p className="text-xs text-gray-400 mt-1">
                  You don't have access to any queues
                </p>
              </div>
            )}

            {/* Table */}
           {selectedQueueId && !isInitialLoading && (
  <div className="rounded-md border w-full">
    <div className="overflow-x-auto w-full">
      <div style={{ minWidth: '1600px' }}>
        <DataTable<Incident>
          title={`Tickets - ${selectedQueueTitle}`}
          icon={<AlertTriangle className="h-5 w-5 text-azam-blue" />}
          headerVariant="gradient"
          data={filteredIncidents}
          columns={columns}
          loading={isLoading}
          error={undefined}
          className="w-full"
        />
      </div>
    </div>
  </div>
)}

            {/* Summary Stats */}
            {selectedQueueId && !isLoading && incidents.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-2">
                <span>Total: <strong>{incidents.length}</strong></span>
                <span>Filtered: <strong>{filteredIncidents.length}</strong></span>
                <span>
                  Open: <strong>{incidents.filter(i => i.status === 'OPEN').length}</strong>
                </span>
                <span>
                  In Progress: <strong>{incidents.filter(i => i.status === 'IN PROGRESS' || i.status === 'IN-PROGRESS').length}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Ticket Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-[1200px] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
  <DialogTitle className="text-xl font-bold flex items-center gap-2">
    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
      {displayTicket?.incidentNumber}
    </span>
    <span>Ticket Details</span>
    {displayTicket && isStatusClosed(displayTicket.status) && (
      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs flex items-center gap-1">
        <Lock className="h-3 w-3" />
        Closed
      </span>
    )}
    {isLoadingDetail && <RotateCw className="h-4 w-4 animate-spin text-gray-400 ml-2" />}
  </DialogTitle>
  <DialogDescription>
    {displayTicket && isStatusClosed(displayTicket.status)
      ? "This incident is closed and cannot be edited."
      : "Detailed view of the selected ticket information."}
  </DialogDescription>
</DialogHeader>

          {displayTicket && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
              <DetailRow label="Title" value={displayTicket.shortDescription} />
              <DetailRow label="Client" value={displayTicket.client} />
              <DetailRow label="Status" value={displayTicket.status} />
              <DetailRow label="Priority" value={displayTicket.priority} />

              <DetailRow label="Category" value={displayTicket.category} />
              <DetailRow label="Sub Category" value={displayTicket.subCategory} />
              <DetailRow label="Channel" value={displayTicket.channel} />
              <DetailRow label="Common Faults" value={displayTicket.commonFault} />

              <DetailRow label="Assignment Group" value={displayTicket.assignmentGroup} />
              <DetailRow label="Assigned To" value={displayTicket.assignedTo} />

              <DetailRow label="Customer Id" value={displayTicket.userId} />
              <DetailRow label="Asset/Device" value={displayTicket.configurationItem} />
              <DetailRow label="Location" value={displayTicket.location} />
              <DetailRow label="Alt Location" value={displayTicket.altLocation} />

              <DetailRow label="Contact Phone" value={displayTicket.phoneNum} />
<DetailRow label="Alt Contact Phone" value={displayTicket.altPhoneNum} />
<DetailRow label="Alt Contact Name" value={displayTicket.altContact} />
<DetailRow label="Incident Contact" value={displayTicket.incidentContact} />

              <DetailRow label="Opened By" value={displayTicket.openedBy} />
              <DetailRow label="Opened On" value={formatDate(displayTicket.opened)} />
              <DetailRow label="Target Resolve" value={formatDate(displayTicket.targetResolveDate)} />
              <DetailRow label="Resolved At" value={displayTicket.resolvedAt ? formatDate(displayTicket.resolvedAt) : "-"} />

              {/* Extended/Other Fields */}
              <DetailRow label="Landing Page #" value={displayTicket.landingPageNumber} />
              <DetailRow label="Internal Case" value={displayTicket.internalCase !== undefined ? String(displayTicket.internalCase) : ""} />
              <DetailRow label="Super Case" value={displayTicket.isSupercase ? "Yes" : "No"} />
              <DetailRow label="SLA Color" value={displayTicket.slaColor} />
              <DetailRow label="Survey Score" value={displayTicket.survey !== undefined ? String(displayTicket.survey) : ""} />
              <DetailRow label="Warranty" value={displayTicket.warranty} />
              <DetailRow label="Repair Type" value={displayTicket.repairType} />
              <DetailRow label="Strikes Level" value={displayTicket.strikesLevel !== undefined ? String(displayTicket.strikesLevel) : ""} />
              <DetailRow label="Agreed Contact" value={formatDate(displayTicket.agreedContact || "")} />
              <DetailRow label="Agreed Agent" value={formatDate(displayTicket.agreedAgentDate || "")} />

              <DetailRow label="SLA" value={displayTicket.sla} />
              <DetailRow label="Case History" value={displayTicket.caseHistory} />

              <DetailRow label="Asset Ref #" value={displayTicket.assetRefNumber} />
              <DetailRow label="Asset Type" value={displayTicket.assetType} />
              <DetailRow label="Asset Tag" value={displayTicket.assetTag} />
              <DetailRow label="Asset Number" value={displayTicket.assetNumber} />
              <DetailRow label="Asset Desc" value={displayTicket.assetDescription} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}