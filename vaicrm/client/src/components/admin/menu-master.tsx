import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MenuFormDialog } from "./menu-form-dialog.tsx";
import { MenuDataTable } from "./menu-data-table.tsx";
import { Plus, Search, Menu } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export type MenuType = "LOGO" | "NAV" | "SECTION";
export type MenuStatus = "ACTIVE" | "INACTIVE";

export interface MenuItem {
    pageId: string | null;
    menuType: MenuType;
    pageSectionName: string | null;
    pageMenu: string;
    pageUrl: string;
    status: MenuStatus;
    navPageId: string;
    parentNavPageId: string;
    pageMenuLabel: string;
    pageMenuIcon: string;
    pageMenuOrder: string | number;
    pageSubMenu?: string | null;
    pageSubUrl?: string | null;
    pageSubMenuIcon?: string | null;
    pageSubMenuOrder?: string | number | null;
    createTs?: string | null;
    createId?: string;
    updateTs?: string;
    updateId?: string;
}

export function MenuMaster() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [menuData, setMenuData] = useState<MenuItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<MenuStatus | "ALL">("ALL");
    const [typeFilter, setTypeFilter] = useState<MenuType | "ALL">("ALL");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchMenus();
    }, []);

    const fetchMenus = async () => {
        setIsLoading(true);
        try {
            const payload = {
                pageId: "",
                menuType: "",
                pageSectionName: "",
                pageMenu: "",
                pageUrl: "",
                status: "",
                offSet: 0,
                limit: 100
            };

            const response = await adminApi.fetchPageMaster(payload);
            if (response && response.status === 'SUCCESS') {
                const data = response.data?.pageMasterBeanList || response.obj || [];
                setMenuData(data);
            } else {
                toast({
                    title: "Error",
                    description: response?.statusMessage || "Failed to fetch menu data",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "An unexpected error occurred while fetching menus",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Filter data for table
    const filteredData = useMemo(() => {
        return menuData.filter((item) => {
            const matchesSearch =
                String(item.pageMenuLabel).toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.pageUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.pageMenu?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
            const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
            const matchesType = typeFilter === "ALL" || item.menuType === typeFilter;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [menuData, searchQuery, statusFilter, typeFilter]);

    const handleAdd = () => {
        setEditingItem(null);
        setIsFormOpen(true);
    };

    const handleEdit = (item: MenuItem) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        setMenuData((prev) => prev.filter((item) => item.pageId !== id));
        toast({
            title: "Success",
            description: "Menu item removed from view",
        });
    };

    const handleSave = async (item: MenuItem) => {
        try {
            let payload: any = {
                ...item,
                pageMenuOrder: String(item.pageMenuOrder),
                createTs: undefined,
                updateTs: undefined,
                createId: undefined,
                updateId: undefined
            };

            if (editingItem) {
                payload = {
                    ...payload,
                    oldPageSectionName: editingItem.pageSectionName,
                    oldPageMenu: editingItem.pageMenu,
                    oldPageMenuLabel: editingItem.pageMenuLabel,
                    oldPageUrl: editingItem.pageUrl,
                    oldPageMenuIcon: editingItem.pageMenuIcon,
                    oldMenuType: editingItem.menuType,
                    oldStatus: editingItem.status,
                    oldNavPageId: editingItem.navPageId,
                    oldParentNavPageId: editingItem.parentNavPageId,
                    oldPageMenuOrder: String(editingItem.pageMenuOrder)
                };
            }

            const response = await adminApi.savePageMaster(payload);

            if (response && response.status === 'SUCCESS') {
                if (editingItem) {
                    setMenuData((prev) =>
                        prev.map((m) => (m.pageId === item.pageId ? item : m))
                    );
                    toast({
                        title: "Success",
                        description: "Menu item updated successfully",
                    });
                } else {
                    setMenuData((prev) => [...prev, item]);
                    toast({
                        title: "Success",
                        description: "Menu item created successfully",
                    });
                }
                setIsFormOpen(false);
                setEditingItem(null);
                fetchMenus(); // Refresh data to get correct pageId if it was new
            } else {
                toast({
                    title: "Error",
                    description: response?.statusMessage || "Failed to save menu item",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "An unexpected error occurred while saving",
                variant: "destructive",
            });
        }
    };

    const handleBulkAction = (action: "activate" | "deactivate", ids: string[]) => {
        const currentUserId = user?.username || "unknown";
        const currentTimestamp = new Date().toISOString();
        setMenuData((prev) =>
            prev.map((item) =>
                item.pageId && ids.includes(item.pageId)
                    ? {
                        ...item,
                        status: action === "activate" ? "ACTIVE" : "INACTIVE",
                        updateTs: currentTimestamp,
                        updateId: currentUserId
                    }
                    : item
            )
        );
        toast({
            title: "Success",
            description: `Successfully ${action === "activate" ? "activated" : "deactivated"} ${ids.length} items.`,
        });
    };

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <Card className="bg-gradient-to-r from-azam-blue to-blue-800 text-white shadow-lg">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-lg">
                                <Menu className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Menu Master</h1>
                                <p className="text-blue-100 text-xs mt-0.5">
                                    Manage application menus and navigation structure
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleAdd}
                            className="bg-white text-azam-blue hover:bg-blue-50 shadow-sm"
                            size="sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Menu
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border p-3 rounded-md bg-gray-50">
                <Input
                    uiSize="sm"
                    placeholder="Search by label or URL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                    className="bg-white"
                />
                <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as MenuStatus | "ALL")}
                >
                    <SelectTrigger uiSize="sm" className="bg-white">
                        <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={typeFilter}
                    onValueChange={(value) => setTypeFilter(value as MenuType | "ALL")}
                >
                    <SelectTrigger uiSize="sm" className="bg-white">
                        <SelectValue placeholder="Filter by Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Types</SelectItem>
                        <SelectItem value="LOGO">Logo</SelectItem>
                        <SelectItem value="NAV">Navigation</SelectItem>
                        <SelectItem value="SECTION">Section</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-azam-blue border-t-transparent" />
                        <p className="text-sm text-slate-500 font-medium">Loading menu data...</p>
                    </div>
                </div>
            ) : (
                <MenuDataTable
                    data={filteredData}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onBulkAction={handleBulkAction}
                />
            )}

            <MenuFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                item={editingItem}
                onSave={handleSave}
                existingMenus={menuData}
            />
        </div>
    );
}
