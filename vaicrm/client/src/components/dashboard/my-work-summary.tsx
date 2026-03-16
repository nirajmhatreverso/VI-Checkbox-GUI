
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
    FileText, Clock, AlertCircle, ArrowRight, CheckCircle2,
    HelpCircle, MoreHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

interface Incident {
    id: number;
    incidentNumber: string;
    status: string;
    shortDescription: string;
    priority: string;
    opened: string;
    slaColor?: string;
    client: string;
}

const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function getStatusLabel(s: number | string) {
    if (typeof s === 'string') return s.toUpperCase();
    const map: Record<number, string> = { 1: 'OPEN', 2: 'IN PROGRESS', 3: 'RESOLVED', 4: 'CLOSED', 5: 'CANCELLED' };
    return map[Number(s)] || String(s);
}

function getPriorityLabel(p: number | string) {
    if (typeof p === 'string') return p;
    const map: Record<number, string> = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };
    return map[Number(p)] || String(p);
}

// Simplified mapper for dashboard view
const mapApiToIncidentSummary = (item: any): Incident => ({
    id: item.objId,
    incidentNumber: item.idNumber || String(item.objId || ""),
    status: getStatusLabel(item.incidentStatus),
    shortDescription: item.title || "-",
    priority: getPriorityLabel(item.incidentPriority),
    opened: item.createTs || item.createDt,
    slaColor: item.slaColor || item.sla,
    client: item.incidentClient || item.incidentReporter2customerName || "-"
});

export default function MyWorkSummary() {
    const [, setLocation] = useLocation();

    const { data: incidentsData, isLoading } = useQuery({
        queryKey: ['incidents-list-summary'],
        queryFn: async () => {
            // Fetching all tickets but we will slice in the UI
            // In a real scenario, we might want to pass pagination params to only fetch 5
            const response = await apiRequest('/organization/tickets/fetch', 'POST', {
                objId: null,
                title: null,
                idNumber: null
            });
            return response;
        }
    });

    const incidents = incidentsData?.data?.data
        ? incidentsData.data.data.map(mapApiToIncidentSummary).slice(0, 5)
        : [];

    const getPriorityColor = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'critical': return 'text-red-600 bg-red-50 border-red-100';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
            case 'low': return 'text-green-600 bg-green-50 border-green-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'RESOLVED':
            case 'CLOSED':
                return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
            case 'IN PROGRESS':
                return <Clock className="w-3.5 h-3.5 text-blue-500" />;
            case 'OPEN':
                return <AlertCircle className="w-3.5 h-3.5 text-orange-500" />;
            default:
                return <HelpCircle className="w-3.5 h-3.5 text-gray-400" />;
        }
    };

    return (
        <Card className="border-0 shadow-lg h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-azam-blue" />
                            My Tickets
                        </CardTitle>
                        <CardDescription className="text-xs">Recent tickets assigned to you</CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-azam-blue hover:text-azam-orange hover:bg-blue-50"
                        onClick={() => setLocation("/my-work")}
                    >
                        View All
                        <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden pt-2">
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : incidents.length > 0 ? (
                    <div className="space-y-3">
                        {incidents.map((ticket: Incident) => (
                            <div
                                key={ticket.id}
                                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all cursor-pointer"
                                onClick={() => setLocation(`/view-incident/${ticket.incidentNumber}`)}
                            >
                                <div className="flex items-start space-x-3 overflow-hidden">
                                    <div className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full 
                    ${ticket.slaColor === 'RED' ? 'bg-red-500' :
                                            ticket.slaColor === 'YELLOW' ? 'bg-yellow-500' :
                                                ticket.slaColor === 'GREEN' ? 'bg-green-500' : 'bg-gray-300'}`}
                                        title={`SLA: ${ticket.slaColor || 'None'}`}
                                    />
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-700 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 group-hover:border-blue-200">
                                                {ticket.incidentNumber}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900 truncate block sm:inline max-w-[200px]" title={ticket.shortDescription}>
                                                {ticket.shortDescription}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                {getStatusIcon(ticket.status)}
                                                {ticket.status}
                                            </span>
                                            <span className="hidden sm:inline">•</span>
                                            <span className="truncate max-w-[120px]">{ticket.client}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 pl-5 sm:pl-0">
                                    <div className="text-xs text-gray-400 whitespace-nowrap flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {formatDate(ticket.opened)}
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border h-5 ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500 space-y-2">
                        <CheckCircle2 className="h-10 w-10 text-gray-300" />
                        <p className="text-sm font-medium">No tickets found</p>
                        <p className="text-xs">You're all caught up!</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
