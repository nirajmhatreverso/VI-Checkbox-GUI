import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Plus,
    ClipboardCheck,
    Pencil,
    Trash2,
    Eye,
    Filter,
    Search,
    Loader2,
    Info,
    Calendar,
    User,
    Clock,
    Settings,
    Activity,
    FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@shared/utils";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/ui/data-table";
import { SurveyBuilder } from "./survey-builder";
import { useQuery } from "@tanstack/react-query";
import { surveyApi, Survey } from "@/lib/surveyApi";
import { useToast } from "@/hooks/use-toast";

// Mock data removed in favor of API integration

export function SurveyForm() {
    const { toast } = useToast();
    const [view, setView] = useState<'list' | 'create'>('list');
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const { data: surveyResponse, isLoading, error } = useQuery({
        queryKey: ['/itsm/survey'],
        queryFn: () => surveyApi.getSurveys(),
    });

    const surveys = useMemo(() => {
        if (surveyResponse?.status === 'SUCCESS' || surveyResponse?.statusCode === 200) {
            return surveyResponse.data || [];
        }
        return [];
    }, [surveyResponse]);

    const filteredSurveys = useMemo(() => {
        return surveys.filter(survey => {
            const matchesSearch = (survey.surveyName || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = typeFilter === "ALL" || survey.scrType === typeFilter;
            const matchesStatus = statusFilter === "ALL" || survey.status === statusFilter;
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [surveys, searchQuery, typeFilter, statusFilter]);

    const surveyTypes = useMemo(() => {
        const types = new Set(surveys.map(s => s.scrType).filter(Boolean));
        return Array.from(types);
    }, [surveys]);

    const handleCreateNew = () => {
        setView('create');
    };

    const handleView = (survey: Survey) => {
        setSelectedSurvey(survey);
        setIsDetailsOpen(true);
    };

    const handleEdit = (survey: Survey) => {
    };

    const handleDelete = (survey: Survey) => {
    };

    const columns: DataTableColumn<Survey>[] = [
        {
            key: "surveyName",
            label: "Survey Title",
            sortable: true,
            render: (value) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-azam-blue border border-blue-100/50">
                        <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-gray-900 group-hover:text-azam-blue transition-colors text-sm text-wrap max-w-[300px]">
                        {value}
                    </span>
                </div>
            ),
        },
        {
            key: "scrType",
            label: "Type",
            sortable: true,
            render: (value) => (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md whitespace-nowrap uppercase tracking-tight">
                    {value}
                </span>
            ),
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            render: (value) => (
                <div className="flex items-center">
                    <StatusBadge
                        status={value === 'ACTIVE' ? 'active' : (value === 'INACTIVE' ? 'expired' : 'pending')}
                        showIcon={true}
                        className="shadow-sm font-semibold py-0.5 text-[10px] rounded-full"
                    />
                </div>
            ),
        },
        {
            key: "duration",
            label: "Duration",
            sortable: true,
            render: (value) => (
                <div className="flex flex-col items-center justify-center leading-tight">
                    <span className="font-extrabold text-gray-900 text-sm">{value}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Mins</span>
                </div>
            ),
        },
        {
            key: "scrOriginator2user",
            label: "Created By ID",
            sortable: true,
            render: (value) => (
                <span className="text-gray-600 font-semibold text-xs whitespace-nowrap">
                    {value}
                </span>
            )
        },
        {
            key: "createDate",
            label: "Created Date",
            sortable: true,
            render: (value) => (
                <span className="text-gray-500 font-medium text-[11px] whitespace-nowrap">
                    {formatDate(value as string)}
                </span>
            ),
        },
    ];

    const actions: DataTableAction<Survey>[] = [
        {
            label: "View",
            icon: <Eye className="h-4 w-4 text-blue-500" />,
            onClick: handleView,
        },
        {
            label: "Edit",
            icon: <Pencil className="h-4 w-4 text-indigo-500" />,
            onClick: handleEdit,
        },
        {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4 text-red-500" />,
            onClick: handleDelete,
            variant: "destructive",
        },
    ];

    if (view === 'create') {
        return (
            <div className="p-4 sm:p-6">
                <SurveyBuilder onBack={() => setView('list')} />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-azam-blue" />
                <p className="text-gray-500 font-medium animate-pulse text-sm uppercase tracking-wider">
                    Loading surveys...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] gap-4 text-center p-6">
                <div className="bg-red-50 p-4 rounded-full">
                    <Trash2 className="h-10 w-10 text-red-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Failed to load surveys</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto mt-1">
                        We encountered an error while trying to fetch the survey data. Please try again later.
                    </p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    Retry Connection
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-4">
            {/* Header Section */}
            <Card className="bg-gradient-to-r from-azam-blue to-blue-800 text-white shadow-lg">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-lg">
                                <ClipboardCheck className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Survey Management</h1>
                                <p className="text-blue-100 text-xs mt-0.5">
                                    Configure and monitor customer feedback forms
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleCreateNew}
                            className="bg-white text-azam-blue hover:bg-blue-50 shadow-sm transition-all duration-300"
                            size="sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Survey
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Filters and Actions Bar */}
            <div className="flex flex-col md:flex-row gap-3 border p-3 rounded-md bg-gray-50">
                <div className="relative flex-1 group">
                    <Input
                        uiSize="sm"
                        placeholder="Search survey title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="h-4 w-4" />}
                        className="bg-white"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger uiSize="sm" className="w-[150px] bg-white border-gray-200">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Types</SelectItem>
                            {surveyTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger uiSize="sm" className="w-[150px] bg-white border-gray-200">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block" />
                    <p className="text-[12px] text-gray-500 font-semibold whitespace-nowrap">
                        Total Surveys: <span className="text-azam-blue">{filteredSurveys.length}</span>
                    </p>
                </div>
            </div>

            {/* Main Content Area with DataTable */}
            <DataTable
                data={filteredSurveys}
                columns={columns}
                actions={actions}
                hideHeader={true}
                className="bg-white rounded-xl shadow-sm border mt-0"
            />

            {/* Survey Details Dialog */}
            <SurveyDetailsDialog
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                survey={selectedSurvey}
            />
        </div>
    );
}

interface SurveyDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    survey: Survey | null;
}

function SurveyDetailsDialog({ open, onOpenChange, survey }: SurveyDetailsDialogProps) {
    if (!survey) return null;

    const details = [
        { label: "Survey Name", value: survey.surveyName },
        { label: "Description", value: survey.description },
        { label: "Script Type", value: survey.scrType },
        { label: "Status", value: survey.status },
        { label: "Duration", value: `${survey.duration} Mins` },
        { label: "Action", value: survey.action },
        { label: "Parameter", value: survey.parm },
        { label: "Created By ID", value: survey.scrOriginator2user },
        { label: "Create Date", value: formatDate(survey.createDate) },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold">Survey Information</DialogTitle>
                    <DialogDescription>Full details for the selected survey record.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-3 py-2">
                    {details.map((item, i) => (
                        <div key={i} className="flex border-b border-gray-100 pb-2 last:border-0">
                            <span className="text-[11px] font-bold text-gray-400 uppercase w-32 shrink-0">{item.label}</span>
                            <span className="text-xs font-semibold text-gray-700">{item.value || "N/A"}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end mt-4">
                    <Button size="sm" onClick={() => onOpenChange(false)}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
