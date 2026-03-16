import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Megaphone,
    Pencil,
    Trash2,
    Eye,
    Search,
    Globe,
    FileText,
    Users,
    Link as LinkIcon,
    Loader2,
    Calendar,
    Tag,
    Hash,
    ExternalLink,
    Lock,
    X,
    CheckCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@shared/utils";
import { AnnouncementForm } from "./announcement-form";
import { useBulletins, Bulletin, BulletinFilters, useSaveBulletinMutation } from "@/hooks/use-bulletin";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

export function Announcements() {
    const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteMutation = useSaveBulletinMutation();

    const [filters] = useState<BulletinFilters>({
        bulletinType: "",
        bulletinName: "",
        bulletinId: "",
        createdDate: "",
        status: "",
        userType: "",
        limit: 10,
        offSet: 0,
    });

    const { data: bulletinData, isLoading, isError } = useBulletins(filters);

    const bulletins = bulletinData?.bulletinDetails || [];
    const totalRecordCount = bulletinData?.totalRecordCount || 0;

    const filteredBulletins = bulletins.filter(bulletin =>
        bulletin.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bulletin.bulletinText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bulletin.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateNew = () => {
        setSelectedBulletin(null);
        setView('create');
    };

    const handleBack = () => {
        setView('list');
    };

    const handleView = (bulletin: Bulletin) => {
        setSelectedBulletin(bulletin);
        setViewDialogOpen(true);
    };

    const handleEdit = (bulletin: Bulletin) => {
        setSelectedBulletin(bulletin);
        setView('edit');
    };

    const handleDelete = (bulletin: Bulletin) => {
        setSelectedBulletin(bulletin);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedBulletin) return;

        setIsDeleting(true);
        try {
            const nextStatus = selectedBulletin.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            const payload = {
                objId: selectedBulletin.objId,
                type: selectedBulletin.type,
                bulletinBusOrgId: selectedBulletin.bulletin2busOrg || "2",
                userType: "ADMIN",
                bulletinBusOrg: "",
                url: selectedBulletin.url || "",
                title: selectedBulletin.title,
                bulletinText: selectedBulletin.bulletinText,
                status: nextStatus
            };

            await deleteMutation.mutateAsync(payload);
            setDeleteDialogOpen(false);
        } catch (error) {
            console.error("Status update failed", error);
        } finally {
            setIsDeleting(false);
            setSelectedBulletin(null);
        }
    };

    const columns: DataTableColumn<Bulletin>[] = [
        {
            key: "title",
            label: "Bulletin Details",
            sortable: true,
            render: (value, item) => (
                <div className="flex items-center gap-3 py-1">
                    <div className="p-2 bg-blue-50 rounded-lg text-azam-blue border border-blue-100/50">
                        <Megaphone className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 group-hover:text-azam-blue transition-colors text-sm">
                            {value}
                        </span>
                        <span className="text-[10px] text-gray-500 line-clamp-1 max-w-[300px]">
                            {item.bulletinText}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: "type",
            label: "Type",
            sortable: true,
            render: (value) => (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap tracking-tight border ${value === 'alert' ? 'bg-red-50 text-red-700 border-red-100' :
                    value === 'update' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-green-50 text-green-700 border-green-100'
                    }`}>
                    {(value as string)?.toUpperCase()}
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
                        status={value === 'ACTIVE' ? 'active' : 'expired'}
                        showIcon={true}
                        className="shadow-sm font-semibold py-0.5 text-[10px] rounded-full"
                    />
                </div>
            ),
        },
        {
            key: "startDate",
            label: "Start Date",
            sortable: true,
            render: (value) => (
                <span className="text-gray-500 font-medium text-[11px] whitespace-nowrap">
                    {formatDate(value as string)}
                </span>
            ),
        },
        {
            key: "endDate",
            label: "End Date",
            sortable: true,
            render: (value) => (
                <span className="text-gray-500 font-medium text-[11px] whitespace-nowrap">
                    {formatDate(value as string)}
                </span>
            ),
        },
        {
            key: "createdDate",
            label: "Created On",
            sortable: true,
            render: (value) => (
                <span className="text-gray-500 font-medium text-[11px] whitespace-nowrap">
                    {formatDate(value as string)}
                </span>
            ),
        },
    ];

    const actions: DataTableAction<Bulletin>[] = [
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
            label: "Deactivate",
            icon: <Trash2 className="h-4 w-4 text-red-500" />,
            onClick: handleDelete,
            variant: "destructive",
            show: (item) => item.status === 'ACTIVE',
        },
        {
            label: "Activate",
            icon: <CheckCircle className="h-4 w-4 text-green-500" />,
            onClick: handleDelete,
            show: (item) => item.status !== 'ACTIVE',
        },
    ];

    if (view === 'create' || view === 'edit') {
        return (
            <div className="p-4 sm:p-6">
                <AnnouncementForm onBack={handleBack} initialData={view === 'edit' ? selectedBulletin : null} />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-4">
            {/* Header Section */}
            <Card className="bg-gradient-to-r from-azam-blue to-indigo-800 text-white shadow-lg">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-lg">
                                <Megaphone className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Announcements</h1>
                                <p className="text-white text-xs mt-0.5 opacity-90">
                                    Broadcast messages and updates to system users
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleCreateNew}
                            className="bg-white text-azam-blue hover:bg-blue-50 shadow-sm transition-all duration-300 font-bold"
                            size="sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Announcement
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Filters bar */}
            <div className="flex flex-col md:flex-row gap-3 border p-3 rounded-md bg-gray-50 items-center justify-between">
                <div className="relative flex-1 max-w-md w-full group">
                    <Input
                        uiSize="sm"
                        placeholder="Search by title, text, or type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="h-4 w-4" />}
                        className="bg-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-[12px] text-gray-500 font-semibold whitespace-nowrap">
                        Total Records: <span className="text-azam-blue">{totalRecordCount}</span>
                    </p>
                </div>
            </div>

            {/* Main Content Area with DataTable */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-azam-blue" />
                    <span className="ml-3 text-sm text-gray-500 font-medium">Loading bulletins...</span>
                </div>
            ) : isError ? (
                <div className="flex items-center justify-center py-16">
                    <p className="text-sm text-red-500 font-medium">Failed to load bulletins. Please try again.</p>
                </div>
            ) : (
                <DataTable
                    data={filteredBulletins}
                    columns={columns}
                    actions={actions}
                    hideHeader={true}
                    className="bg-white rounded-xl shadow-sm border mt-0"
                />
            )}

            {/* View Bulletin Details Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-md">
                                <Megaphone className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-gray-900">
                                    {selectedBulletin?.title || 'Bulletin Details'}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                                    Complete bulletin information
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedBulletin && (
                        <div className="space-y-5 pt-2">
                            {/* Status & Type Row */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <StatusBadge
                                    status={selectedBulletin.status === 'ACTIVE' ? 'active' : 'expired'}
                                    showIcon={true}
                                    className="shadow-sm font-semibold py-1 px-3 text-xs rounded-full"
                                />
                                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${selectedBulletin.type === 'alert' ? 'bg-red-50 text-red-700 border-red-200' :
                                    selectedBulletin.type === 'update' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        'bg-green-50 text-green-700 border-green-200'
                                    }`}>
                                    {selectedBulletin.type?.toUpperCase()}
                                </span>
                                {selectedBulletin.isPrivate && (
                                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                        <Lock className="h-3 w-3" /> Private
                                    </span>
                                )}
                                {selectedBulletin.isExternal && (
                                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                        <ExternalLink className="h-3 w-3" /> External
                                    </span>
                                )}
                            </div>

                            {/* Bulletin Text */}
                            {selectedBulletin.bulletinText && (
                                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bulletin Text</p>
                                    <p className="text-sm text-gray-800 leading-relaxed">{selectedBulletin.bulletinText}</p>
                                </div>
                            )}

                            {/* URL */}
                            {selectedBulletin.url && (
                                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">URL</p>
                                    <a
                                        href={selectedBulletin.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1.5 font-medium"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        {selectedBulletin.url}
                                    </a>
                                </div>
                            )}

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-white border border-gray-100 rounded-lg p-4">
                                <DetailItem icon={<Hash className="h-3.5 w-3.5" />} label="Bulletin ID" value={selectedBulletin.objId} />
                                <DetailItem icon={<Tag className="h-3.5 w-3.5" />} label="Type" value={selectedBulletin.type?.toUpperCase()} />
                                <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="Start Date" value={formatDate(selectedBulletin.startDate)} />
                                <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="End Date" value={formatDate(selectedBulletin.endDate)} />
                                <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="Created Date" value={formatDate(selectedBulletin.createdDate)} />
                                <DetailItem label="Status" value={selectedBulletin.status} />
                                {selectedBulletin.idNumber && (
                                    <DetailItem label="ID Number" value={selectedBulletin.idNumber} />
                                )}
                                {selectedBulletin.focusType && (
                                    <DetailItem label="Focus Type" value={selectedBulletin.focusType} />
                                )}
                                {selectedBulletin.focusLowId && (
                                    <DetailItem label="Focus Low ID" value={selectedBulletin.focusLowId} />
                                )}
                                {selectedBulletin.arcInd && (
                                    <DetailItem label="Archive Indicator" value={selectedBulletin.arcInd} />
                                )}
                                {selectedBulletin.modifyStamp && (
                                    <DetailItem label="Last Modified" value={formatDate(selectedBulletin.modifyStamp)} />
                                )}
                                {selectedBulletin.bulletin2contact && (
                                    <DetailItem label="Contact" value={selectedBulletin.bulletin2contact} />
                                )}
                                {selectedBulletin.bulletin2site && (
                                    <DetailItem label="Site" value={selectedBulletin.bulletin2site} />
                                )}
                                {selectedBulletin.bulletin2busOrg && (
                                    <DetailItem label="Business Org" value={selectedBulletin.bulletin2busOrg} />
                                )}
                                {selectedBulletin.lastUpdate2user && (
                                    <DetailItem label="Last Updated By" value={selectedBulletin.lastUpdate2user} />
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
                setDeleteDialogOpen(open);
                if (!open) setSelectedBulletin(null);
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${selectedBulletin?.status === 'ACTIVE' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {selectedBulletin?.status === 'ACTIVE' ? <Trash2 className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-gray-900">
                                    {selectedBulletin?.status === 'ACTIVE' ? "Deactivate Announcement" : "Activate Announcement"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                                    {selectedBulletin?.status === 'ACTIVE'
                                        ? "Are you sure you want to deactivate this bulletin?"
                                        : "Are you sure you want to activate this bulletin?"}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedBulletin && (
                        <div className="py-2">
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="font-bold">Title:</span> {selectedBulletin.title}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isDeleting}
                            className="text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={selectedBulletin?.status === 'ACTIVE' ? "destructive" : "default"}
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className={`text-xs font-bold ${selectedBulletin?.status !== 'ACTIVE' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                    {selectedBulletin?.status === 'ACTIVE' ? "Deactivating..." : "Activating..."}
                                </>
                            ) : (
                                selectedBulletin?.status === 'ACTIVE' ? "Yes, Deactivate" : "Yes, Activate"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/** Small reusable component for the detail grid items */
function DetailItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string | null }) {
    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                {icon}
                {label}
            </p>
            <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
        </div>
    );
}
