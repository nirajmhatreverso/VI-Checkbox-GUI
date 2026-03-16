import React, { useState, useMemo, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RoleFormDialog } from "./role-form-dialog";
import {
    Plus,
    Search,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Save,
    CheckSquare,
    Square,
    AlertTriangle,
    Shield,
    MoreVertical,
    Users,
    LayoutGrid,
    ChevronRight,
    ChevronDown,
    ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Import types and hooks from the new controller
import {
    useRoles,
    useRolePermissions,
    useCreateRoleMutation,
    useUpdateRoleMutation,
    useDeleteRoleMutation,
    usePageMaster,
    type Role,
    type RoleStatus,
    type PagePermission,
} from "@/hooks/use-role-master";
import { useIsMobile } from "@/hooks/use-mobile";

// Local type definitions removed in favor of imported types from hooks

export function RoleMasterCombined() {
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const { data: roles = [], isLoading: isRolesLoading } = useRoles();
    const { data: pageMaster = [], isLoading: isPageMasterLoading } = usePageMaster();
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");
    const { data: rolePermissions = [], isLoading: isPermissionsLoading } = useRolePermissions(selectedRoleId);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<RoleStatus | "ALL">("ALL");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Tracks constraints on the selected role for edit
    const [localRoleState, setLocalRoleState] = useState<Role | null>(null);
    const [permissions, setPermissions] = useState<PagePermission[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [permissionSearchQuery, setPermissionSearchQuery] = useState("");

    const toggleGroup = (group: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(group)) {
                next.delete(group);
            } else {
                next.add(group);
            }
            return next;
        });
    };

    // Track last loaded role ID to detect when it actually changes
    const [lastLoadedRoleId, setLastLoadedRoleId] = useState<string>("");

    // Sync local state when a role is selected OR when page master/permissions change
    useEffect(() => {
        if (selectedRoleId) {
            // If the role changed, we ALWAYS want to load new data
            // If the role is the same, but data changed, we only load if there are NO local changes
            const roleIdChanged = selectedRoleId !== lastLoadedRoleId;

            if (roleIdChanged || !hasChanges) {
                const role = roles.find(r => r.roleId === selectedRoleId);
                if (role) {
                    setLocalRoleState({ ...role });
                }

                // Merge Page Master with Role Permissions
                const mergedPermissions: PagePermission[] = pageMaster.map(page => {
                    const existing = rolePermissions.find((rp: PagePermission) => rp.pageId === page.pageId);

                    return {
                        pageId: page.pageId || "",
                        rpmId: existing?.rpmId || null,
                        navPageId: page.navPageId,
                        parentNavPageId: page.parentNavPageId,
                        pageMenu: page.pageMenu,
                        pageSubMenu: page.pageSubMenu || null,
                        pageSectionName: page.pageSectionName || null,
                        pageMenuLabel: page.pageMenuLabel,
                        pageUrl: page.pageUrl,
                        status: (existing ? existing.status : "INACTIVE") as "ACTIVE" | "INACTIVE",
                        viewAccess: existing ? existing.viewAccess : false,
                        addAccess: existing ? existing.addAccess : false,
                        editAccess: existing ? existing.editAccess : false,
                        exportAccess: existing ? existing.exportAccess : false,
                    };
                });

                setPermissions(mergedPermissions);
                setHasChanges(false);
                if (roleIdChanged) setLastLoadedRoleId(selectedRoleId);
            }
        } else {
            setLocalRoleState(null);
            setPermissions([]);
            setLastLoadedRoleId("");
            setHasChanges(false);
        }
    }, [selectedRoleId, roles, rolePermissions, pageMaster, lastLoadedRoleId, hasChanges]);

    // Filter roles
    const filteredRoles = useMemo(() => {
        return roles.filter((role) => {
            const matchesSearch = role.roleName.toLowerCase().includes(
                searchQuery.toLowerCase()
            );
            const matchesStatus =
                statusFilter === "ALL" || role.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [roles, searchQuery, statusFilter]);



    // Group pages by navigation menu
    const groupedPages = useMemo(() => {
        const groups: Record<string, PagePermission[]> = {};
        permissions.forEach((page) => {
            const key = page.pageMenu;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(page);
        });
        return groups;
    }, [permissions]);

    // Filtered grouped pages based on search
    const filteredGroupedPages = useMemo(() => {
        if (!permissionSearchQuery) return groupedPages;

        const query = permissionSearchQuery.toLowerCase();
        const filtered: Record<string, PagePermission[]> = {};

        Object.entries(groupedPages).forEach(([key, pages]) => {
            const matchesPages = pages.filter(p =>
                p.pageMenu.toLowerCase().includes(query) ||
                (p.pageSubMenu && p.pageSubMenu.toLowerCase().includes(query)) ||
                (p.pageMenuLabel && p.pageMenuLabel.toLowerCase().includes(query)) ||
                (p.pageUrl && p.pageUrl.toLowerCase().includes(query))
            );

            if (matchesPages.length > 0 || key.toLowerCase().includes(query)) {
                filtered[key] = matchesPages.length > 0 ? matchesPages : pages;
            }
        });

        return filtered;
    }, [groupedPages, permissionSearchQuery]);

    const handleExpandAll = () => {
        setExpandedGroups(new Set(Object.keys(groupedPages)));
    };

    const handleCollapseAll = () => {
        setExpandedGroups(new Set());
    };

    const areAllInGroupChecked = (groupKey: string, field: keyof Pick<PagePermission, "viewAccess" | "addAccess" | "editAccess" | "exportAccess" | "status">) => {
        const pages = filteredGroupedPages[groupKey] || [];
        if (pages.length === 0) return false;
        if (field === "status") {
            return pages.every(p => p.status === "ACTIVE");
        }
        return pages.every(p => p[field as keyof Pick<PagePermission, "viewAccess" | "addAccess" | "editAccess" | "exportAccess">]);
    };

    const isSomeInGroupChecked = (groupKey: string, field: keyof Pick<PagePermission, "viewAccess" | "addAccess" | "editAccess" | "exportAccess" | "status">) => {
        const pages = filteredGroupedPages[groupKey] || [];
        if (pages.length === 0) return false;
        if (field === "status") {
            const activeCount = pages.filter(p => p.status === "ACTIVE").length;
            return activeCount > 0 && activeCount < pages.length;
        }
        const fieldKey = field as keyof Pick<PagePermission, "viewAccess" | "addAccess" | "editAccess" | "exportAccess">;
        return pages.some(p => p[fieldKey]) && !pages.every(p => p[fieldKey]);
    };

    const updateGroupPermission = (
        groupKey: string,
        field: keyof Pick<PagePermission, "viewAccess" | "addAccess" | "editAccess" | "exportAccess" | "status">,
        value: boolean
    ) => {
        const groupPages = filteredGroupedPages[groupKey] || [];
        const pageIds = new Set(groupPages.map(p => p.pageId));

        setPermissions((prev) =>
            prev.map((p) => {
                if (pageIds.has(p.pageId)) {
                    if (field === "status") {
                        return { ...p, status: value ? "ACTIVE" : "INACTIVE" };
                    }

                    const fieldKey = field as keyof Pick<PagePermission, "viewAccess" | "addAccess" | "editAccess" | "exportAccess">;
                    const updated = { ...p, [fieldKey]: value };
                    // Auto-enable VIEW if any other permission is enabled
                    if (value && field !== "viewAccess") {
                        updated.viewAccess = true;
                    }
                    // Auto-disable dependent permissions if VIEW is disabled
                    if (!value && field === "viewAccess") {
                        updated.addAccess = false;
                        updated.editAccess = false;
                        updated.exportAccess = false;
                    }
                    return updated;
                }
                return p;
            })
        );
        setHasChanges(true);
    };

    const handleAdd = () => {
        setEditingRole(null);
        setIsFormOpen(true);
    };

    const handleEdit = (role: Role, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingRole(role);
        setIsFormOpen(true);
    };

    const handleDeactivate = (id: string) => {
        const roleToUpdate = roles.find(r => r.roleId === id);
        if (!roleToUpdate) return;

        const newStatus = roleToUpdate.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const permsToPass = id === selectedRoleId ? permissions : undefined; // Pass current permissions if selected

        updateRoleMutation.mutate({ role: { ...roleToUpdate, status: newStatus }, permissions: permsToPass }, {
            onSuccess: (response: any) => {
                setDeleteId(null);
                const successMsg = response?.statusMessage || `Role ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully`;
                toast({
                    title: "Success",
                    description: successMsg,
                });
            },
            onError: (error: any) => {
                const errorMsg = error?.response?.data?.statusMessage || error?.statusMessage || error?.message || "Failed to update role status";
                toast({
                    title: "Error",
                    description: errorMsg,
                    variant: "destructive",
                });
            }
        });
    };

    const createRoleMutation = useCreateRoleMutation();
    const updateRoleMutation = useUpdateRoleMutation();
    // const deleteRoleMutation = useDeleteRoleMutation(); // No longer used

    const handleSave = async (role: Role) => {
        if (editingRole) {
            // Update
            try {
                // Ensure roleId is not null
                if (!role.roleId) {
                    toast({
                        title: "Error",
                        description: "Role ID is missing for update.",
                        variant: "destructive",
                    });
                    return;
                }

                // If we are editing the currently selected role, we have its current permissions
                // Otherwise, we might need to fetch them, but for metadata-only update, 
                // we can pass existing permissions from the role object if they were there,
                // or just the rolePermissions currently in state if it's the same role.
                const permsToPass = selectedRoleId === role.roleId ? permissions : rolePermissions;

                const response = await updateRoleMutation.mutateAsync({ role: role, permissions: permsToPass });
                const successMsg = response?.statusMessage || "Role updated successfully";
                toast({
                    title: "Success",
                    description: successMsg,
                });
            } catch (error: any) {
                const errorMessage = error?.response?.data?.statusMessage || error?.message || error?.uiMessage || error?.statusMessage || "Failed to update role";
                toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                });
                return; // Don't close form on error
            }
        } else {
            // Add
            try {
                const { roleId, ...roleData } = role;
                const response = await createRoleMutation.mutateAsync(roleData);
                const successMsg = response?.statusMessage || "Role created successfully";
                toast({
                    title: "Success",
                    description: successMsg,
                });
            } catch (error: any) {
                const errorMessage = error?.response?.data?.statusMessage || error?.message || error?.uiMessage || error?.statusMessage || "Failed to create role";
                toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                });
                return; // Don't close form on error
            }
        }
        setIsFormOpen(false);
        setEditingRole(null);
    };

    const handleSelectRole = (roleId: string) => {
        if (hasChanges) {
            const confirmChange = window.confirm("You have unsaved changes. Are you sure you want to switch roles?");
            if (!confirmChange) return;
        }
        setSelectedRoleId(roleId);
    };

    const updateRoleField = (field: keyof Role, value: any) => {
        if (!localRoleState) return;
        setLocalRoleState(prev => prev ? { ...prev, [field]: value } : null);
        setHasChanges(true);
    };

    const updatePermission = (
        pageId: string,
        field: keyof Pick<PagePermission, "viewAccess" | "addAccess" | "editAccess" | "exportAccess">,
        value: boolean
    ) => {
        setPermissions((prev) =>
            prev.map((p) => {
                if (p.pageId === pageId) {
                    const updated = { ...p, [field]: value };
                    // Auto-enable VIEW if any other permission is enabled
                    if (value && field !== "viewAccess") {
                        updated.viewAccess = true;
                    }
                    // Auto-disable dependent permissions if VIEW is disabled
                    if (!value && field === "viewAccess") {
                        updated.addAccess = false;
                        updated.editAccess = false;
                        updated.exportAccess = false;
                    }
                    return updated;
                }
                return p;
            })
        );
        setHasChanges(true);
    };

    const handleSavePermissions = async () => {
        if (!localRoleState || !selectedRole) return;

        try {
            // Use updateRoleMutation for inline editing as well
            const response = await updateRoleMutation.mutateAsync({ role: localRoleState, permissions: permissions });
            const successMsg = response?.statusMessage || "Role details have been updated successfully.";
            toast({
                title: "Success",
                description: successMsg,
            });
            setHasChanges(false);

        } catch (error: any) {
            const errorMessage = error?.response?.data?.statusMessage || error?.message || error?.uiMessage || error?.statusMessage || "Failed to update role";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        }
    };

    const selectedRole = roles.find(r => r.roleId === selectedRoleId);

    return (
        <div className="h-[calc(100vh-4rem)] bg-slate-50 p-4 sm:p-6 overflow-hidden flex flex-col">
            {/* Header Area */}
            {/* Header Area */}
            <Card className="mb-6 bg-gradient-to-r from-azam-blue to-blue-800 text-white shadow-lg border-0">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-lg">
                                <Shield className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Role Management</h1>
                                <p className="text-blue-100 text-xs mt-0.5">Configure roles and their associated permissions</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Left Sidebar - Role List */}
                <Card className={`flex flex-col h-full border-slate-200 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl ${isMobile ? (selectedRoleId ? "hidden" : "w-full") : "w-1/3"}`}>
                    <CardHeader className="p-5 border-b border-slate-100 bg-white/50 sticky top-0 z-10">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg text-white shadow-md shadow-blue-200">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base">Roles</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Management</p>
                                </div>
                            </div>
                            <Button onClick={handleAdd} size="sm" className="bg-azam-blue hover:bg-blue-700 shadow-md shadow-blue-200 text-xs h-8 px-3 rounded-lg transition-all hover:scale-105 active:scale-95">
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                New Role
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    placeholder="Search roles..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm w-full rounded-lg"
                                />
                            </div>
                            <Select
                                value={statusFilter}
                                onValueChange={(value) => setStatusFilter(value as RoleStatus | "ALL")}
                            >
                                <SelectTrigger className="h-9 w-[130px] text-xs bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 rounded-lg">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Status</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>

                    {/* Table Header */}
                    <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3 sticky top-[73px] z-10 backdrop-blur-sm">
                        <div className="w-10" /> {/* Spacer for Icon */}
                        <div className="flex-1 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <div className="col-span-4">Role Name</div>
                            <div className="col-span-5">Description</div>
                            <div className="col-span-3 text-right">Status</div>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 bg-slate-50/50 relative">
                        {isRolesLoading && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-azam-blue border-t-transparent" />
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Loading Roles...</p>
                                </div>
                            </div>
                        )}
                        <div className="p-3 space-y-2">
                            {filteredRoles.map((role) => {
                                // Helper to determine icon based on role name
                                const getRoleIcon = (name: string) => {
                                    const secureName = name.toUpperCase();
                                    if (secureName.includes("ADMIN")) return <Shield className="w-5 h-5 text-indigo-600" />;
                                    if (secureName.includes("AGENT")) return <Users className="w-5 h-5 text-blue-600" />;
                                    if (secureName.includes("SUB_AGENT")) return <Users className="w-5 h-5 text-sky-600" />;
                                    if (secureName.includes("EMPLOYEE")) return <Users className="w-5 h-5 text-slate-600" />;
                                    if (secureName.includes("CUSTOMER")) return <Users className="w-5 h-5 text-green-600" />;
                                    if (secureName.includes("KYC")) return <CheckSquare className="w-5 h-5 text-amber-600" />;
                                    if (secureName.includes("FINANCE")) return <LayoutGrid className="w-5 h-5 text-emerald-600" />;
                                    return <LayoutGrid className="w-5 h-5 text-slate-400" />;
                                };

                                return (
                                    <div
                                        key={role.roleId}
                                        onClick={() => handleSelectRole(role.roleId)}
                                        className={`
                                            group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer
                                            ${selectedRoleId === role.roleId
                                                ? "bg-gradient-to-r from-blue-50/80 to-white/80 border-blue-200 shadow-sm ring-1 ring-blue-100"
                                                : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5"
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Role Icon */}
                                            <div className={`
                                                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                                                ${selectedRoleId === role.roleId ? "bg-white shadow-sm ring-1 ring-blue-50" : "bg-slate-50 group-hover:bg-blue-50"}
                                            `}>
                                                {getRoleIcon(role.roleName)}
                                            </div>

                                            <div className="flex-1 grid grid-cols-12 gap-2 items-center min-w-0">
                                                {/* Role Name */}
                                                <div className="col-span-4 pr-2">
                                                    <h4 className={`font-bold text-sm truncate ${selectedRoleId === role.roleId ? "text-slate-900" : "text-slate-700 group-hover:text-blue-700 transition-colors"}`}>
                                                        {role.roleName}
                                                    </h4>
                                                </div>

                                                {/* Description */}
                                                <div className="col-span-5 pr-2">
                                                    <p className="text-xs text-slate-500 truncate" title={role.roleDescription}>
                                                        {role.roleDescription}
                                                    </p>
                                                </div>

                                                {/* Status */}
                                                <div className="col-span-3 flex justify-end">
                                                    {role.status === "ACTIVE" ? (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inactive</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {selectedRoleId === role.roleId && (
                                            <div className="absolute left-0 top-3 bottom-3 w-1 bg-azam-blue rounded-r-full" />
                                        )}
                                    </div>
                                );
                            })}

                            {filteredRoles.length === 0 && (
                                <div className="text-center py-10 px-4">
                                    <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Search className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">No roles found</p>
                                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 text-center">
                        {filteredRoles.length} roles found
                    </div>
                </Card>

                {/* Right Content - Permissions Matrix & Role Management */}
                <Card className={`flex-1 flex flex-col h-full border-slate-200 shadow-sm overflow-hidden bg-white ${isMobile && !selectedRoleId ? "hidden" : ""}`}>
                    {!selectedRoleId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                            <div className="bg-white p-6 rounded-full shadow-lg mb-6 border border-slate-100 animate-in zoom-in-95 duration-300">
                                <div className="bg-blue-50 p-4 rounded-full">
                                    <LayoutGrid className="w-12 h-12 text-azam-blue" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Role to Manage</h3>
                            <p className="text-slate-500 max-w-md mx-auto mb-8">
                                Choose a role from the sidebar to view and modify its access permissions across the application.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between border-b border-slate-100 py-3 sm:py-4 px-4 sm:px-6 bg-white sticky top-0 z-20 gap-2">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {isMobile && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="-ml-2 h-8 w-8 shrink-0"
                                            onClick={() => setSelectedRoleId("")}
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                        </Button>
                                    )}
                                    <div className="min-w-0">
                                        <div className={`flex items-center gap-2 text-sm text-slate-500 mb-1 ${isMobile ? "hidden" : "flex"}`}>
                                            <span>Permissions</span>
                                            <ChevronRight className="w-4 h-4" />
                                            <span className="font-medium text-azam-blue truncate max-w-[150px]">{selectedRole?.roleName}</span>
                                        </div>
                                        <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                                            {isMobile ? selectedRole?.roleName : "Access Control"}
                                        </h2>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {selectedRole && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => selectedRole && setDeleteId(selectedRole.roleId)}
                                            className={`h-8 px-2 sm:px-3 hover:bg-slate-100 ${selectedRole.status === "ACTIVE"
                                                ? "text-slate-600 hover:text-red-600 hover:bg-red-50"
                                                : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                                                }`}
                                            title={selectedRole.status === "ACTIVE" ? "Deactivate Role" : "Activate Role"}
                                        >
                                            {selectedRole.status === "ACTIVE" ? (
                                                <Trash2 className="w-4 h-4" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4" />
                                            )}
                                            <span className="hidden sm:inline ml-2">
                                                {selectedRole.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                            </span>
                                        </Button>
                                    )}

                                    {hasChanges && (
                                        <Badge variant="outline" className="hidden sm:flex border-amber-200 bg-amber-50 text-amber-700 animate-pulse">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            Unsaved Changes
                                        </Badge>
                                    )}

                                    <Button
                                        onClick={handleSavePermissions}
                                        disabled={!hasChanges}
                                        size="sm"
                                        className="bg-azam-blue hover:bg-blue-700 shadow-sm transition-all h-8 px-2 sm:px-3"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span className="hidden sm:inline ml-2">Save Changes</span>
                                    </Button>
                                </div>
                            </div>

                            <Tabs defaultValue="manage" className="flex-1 flex flex-col min-h-0">
                                <div className="px-6 border-b border-slate-200 bg-white">
                                    <TabsList className="h-12 w-full justify-start bg-transparent p-0 gap-6">
                                        <TabsTrigger
                                            value="manage"
                                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-azam-blue data-[state=active]:text-azam-blue text-slate-500 rounded-none h-full px-0 font-medium"
                                        >
                                            Manage Role
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="permissions"
                                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-azam-blue data-[state=active]:text-azam-blue text-slate-500 rounded-none h-full px-0 font-medium"
                                        >
                                            Page Permissions
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="manage" className="flex-1 overflow-hidden data-[state=active]:flex flex-col m-0 p-0">
                                    <ScrollArea className="flex-1">
                                        <div className="p-6 space-y-8">
                                            {/* Edit Role Details */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                                    <Edit className="w-4 h-4 text-azam-blue" />
                                                    Role Details
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Role ID</label>
                                                        <Input
                                                            value={localRoleState?.roleId || ""}
                                                            readOnly
                                                            className="bg-slate-50 font-mono text-xs cursor-not-allowed"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Role Name</label>
                                                        <Input
                                                            value={localRoleState?.roleName || ""}
                                                            onChange={(e) => updateRoleField("roleName", e.target.value)}
                                                            placeholder="Enter role name"
                                                            className="bg-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Description</label>
                                                        <Input
                                                            value={localRoleState?.roleDescription || ""}
                                                            onChange={(e) => updateRoleField("roleDescription", e.target.value)}
                                                            placeholder="Enter role description"
                                                            className="bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Access Control Flags */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-6">
                                                    {/* General Access Section */}
                                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                                                        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                                            <Shield className="w-4 h-4 text-azam-blue" />
                                                            General Access
                                                        </h3>
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                                <div className="space-y-0.5">
                                                                    <label className="text-sm font-medium text-slate-700">Checker Access</label>
                                                                    <p className="text-[10px] text-slate-500">Allows role to perform checker functions</p>
                                                                </div>
                                                                <Switch
                                                                    checked={localRoleState?.checkerAccess}
                                                                    onCheckedChange={(c) => updateRoleField("checkerAccess", c)}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                                <div className="space-y-0.5">
                                                                    <label className="text-sm font-medium text-slate-700">All Access</label>
                                                                    <p className="text-[10px] text-slate-500">Grants full system access privileges</p>
                                                                </div>
                                                                <Switch
                                                                    checked={localRoleState?.allAccess}
                                                                    onCheckedChange={(c) => updateRoleField("allAccess", c)}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                                <div className="space-y-0.5">
                                                                    <label className="text-sm font-medium text-slate-700">Auto Approve</label>
                                                                    <p className="text-[10px] text-slate-500">Enables auto-approval capabilities</p>
                                                                </div>
                                                                <Switch
                                                                    checked={localRoleState?.autoApproveAccess}
                                                                    onCheckedChange={(c) => updateRoleField("autoApproveAccess", c)}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                                <div className="space-y-0.5">
                                                                    <label className="text-sm font-medium text-slate-700">External API</label>
                                                                    <p className="text-[10px] text-slate-500">Access to external API integration points</p>
                                                                </div>
                                                                <Switch
                                                                    checked={localRoleState?.externalApiAccess}
                                                                    onCheckedChange={(c) => updateRoleField("externalApiAccess", c)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    {/* CRUD Permissions Section */}
                                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                                                        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                                            <LayoutGrid className="w-4 h-4 text-azam-blue" />
                                                            Data Permissions
                                                        </h3>
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                                <div className="space-y-0.5">
                                                                    <label className="text-sm font-medium text-slate-700">View Access</label>
                                                                    <p className="text-[10px] text-slate-500">Read-only access to data modules</p>
                                                                </div>
                                                                <Switch
                                                                    checked={localRoleState?.viewAccess}
                                                                    onCheckedChange={(c) => updateRoleField("viewAccess", c)}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                                <div className="space-y-0.5">
                                                                    <label className="text-sm font-medium text-slate-700">Add Access</label>
                                                                    <p className="text-[10px] text-slate-500">Permission to create new records</p>
                                                                </div>
                                                                <Switch
                                                                    checked={localRoleState?.addAccess}
                                                                    onCheckedChange={(c) => updateRoleField("addAccess", c)}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                                <div className="space-y-0.5">
                                                                    <label className="text-sm font-medium text-slate-700">Edit Access</label>
                                                                    <p className="text-[10px] text-slate-500">Permission to modify existing records</p>
                                                                </div>
                                                                <Switch
                                                                    checked={localRoleState?.editAccess}
                                                                    onCheckedChange={(c) => updateRoleField("editAccess", c)}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                                <div className="space-y-0.5">
                                                                    <label className="text-sm font-medium text-slate-700">Export Access</label>
                                                                    <p className="text-[10px] text-slate-500">Ability to export data reports</p>
                                                                </div>
                                                                <Switch
                                                                    checked={localRoleState?.exportAccess}
                                                                    onCheckedChange={(c) => updateRoleField("exportAccess", c)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="permissions" className="flex-1 overflow-hidden data-[state=active]:flex flex-col m-0 p-0 relative">
                                    {isPermissionsLoading && (
                                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-azam-blue border-t-transparent" />
                                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Loading Permissions...</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-slate-500">
                                                Configure granular page-level permissions for the <span className="font-semibold text-slate-700">{selectedRole?.roleName}</span> role.
                                            </p>
                                        </div>
                                    </div>
                                    <ScrollArea className="flex-1">
                                        <div className="p-4 sm:p-6">
                                            {/* Permissions Toolbar */}
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                                                <div className="relative flex-1 w-full max-w-sm">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <Input
                                                        placeholder="Search pages or menus..."
                                                        value={permissionSearchQuery}
                                                        onChange={(e) => setPermissionSearchQuery(e.target.value)}
                                                        className="pl-9 h-9 bg-white border-slate-200 focus:ring-azam-blue/20"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleExpandAll}
                                                        className="h-8 text-xs text-slate-600 hover:text-azam-blue"
                                                    >
                                                        Expand All
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleCollapseAll}
                                                        className="h-8 text-xs text-slate-600 hover:text-azam-blue"
                                                    >
                                                        Collapse All
                                                    </Button>
                                                    <Separator orientation="vertical" className="h-6 mx-1" />
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-bold h-6">
                                                        {permissions.length} Total Pages
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                                                {/* Tree Header */}
                                                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                                                    <div className="col-span-12 md:col-span-5">Navigation Menu / Page</div>
                                                    <div className="hidden md:block col-span-1 text-center">View</div>
                                                    <div className="hidden md:block col-span-1 text-center">Add</div>
                                                    <div className="hidden md:block col-span-1 text-center">Edit</div>
                                                    <div className="hidden md:block col-span-1 text-center">Export</div>
                                                    <div className="hidden md:block col-span-1 text-center">Status</div>
                                                    <div className="hidden md:block col-span-2 text-right">Details</div>
                                                </div>

                                                <div className="divide-y divide-slate-100">
                                                    {Object.entries(filteredGroupedPages).map(([groupKey, pages]) => (
                                                        <Collapsible
                                                            key={`group-${groupKey}`}
                                                            open={expandedGroups.has(groupKey)}
                                                            onOpenChange={() => toggleGroup(groupKey)}
                                                            className="w-full"
                                                        >
                                                            <CollapsibleTrigger asChild>
                                                                <div className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-blue-50/50 cursor-pointer transition-colors border-b border-blue-100/30 bg-white group">
                                                                    <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                                                                        <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 group-hover:bg-blue-100 transition-colors">
                                                                            {expandedGroups.has(groupKey) ? (
                                                                                <ChevronDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-600" />
                                                                            ) : (
                                                                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-600" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <LayoutGrid className="w-4 h-4 text-azam-blue" />
                                                                            <span className="font-bold text-slate-800 text-sm">{groupKey}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="hidden md:flex col-span-1 justify-center" onClick={(e) => e.stopPropagation()}>
                                                                        <Checkbox
                                                                            checked={areAllInGroupChecked(groupKey, "viewAccess")}
                                                                            onCheckedChange={(checked) => updateGroupPermission(groupKey, "viewAccess", !!checked)}
                                                                            className="data-[state=checked]:bg-azam-blue data-[state=checked]:border-azam-blue"
                                                                        />
                                                                    </div>
                                                                    <div className="hidden md:flex col-span-1 justify-center" onClick={(e) => e.stopPropagation()}>
                                                                        <Checkbox
                                                                            checked={areAllInGroupChecked(groupKey, "addAccess")}
                                                                            onCheckedChange={(checked) => updateGroupPermission(groupKey, "addAccess", !!checked)}
                                                                            className="data-[state=checked]:bg-azam-blue data-[state=checked]:border-azam-blue"
                                                                        />
                                                                    </div>
                                                                    <div className="hidden md:flex col-span-1 justify-center" onClick={(e) => e.stopPropagation()}>
                                                                        <Checkbox
                                                                            checked={areAllInGroupChecked(groupKey, "editAccess")}
                                                                            onCheckedChange={(checked) => updateGroupPermission(groupKey, "editAccess", !!checked)}
                                                                            className="data-[state=checked]:bg-azam-blue data-[state=checked]:border-azam-blue"
                                                                        />
                                                                    </div>
                                                                    <div className="hidden md:flex col-span-1 justify-center" onClick={(e) => e.stopPropagation()}>
                                                                        <Checkbox
                                                                            checked={areAllInGroupChecked(groupKey, "exportAccess")}
                                                                            onCheckedChange={(checked) => updateGroupPermission(groupKey, "exportAccess", !!checked)}
                                                                            className="data-[state=checked]:bg-azam-blue data-[state=checked]:border-azam-blue"
                                                                        />
                                                                    </div>
                                                                    <div className="hidden md:flex col-span-1 justify-center" onClick={(e) => e.stopPropagation()}>
                                                                        <Checkbox
                                                                            checked={areAllInGroupChecked(groupKey, "status")}
                                                                            onCheckedChange={(checked) => updateGroupPermission(groupKey, "status", !!checked)}
                                                                            className="data-[state=checked]:bg-azam-blue data-[state=checked]:border-azam-blue"
                                                                        />
                                                                    </div>
                                                                    <div className="hidden md:flex col-span-2 justify-end items-center gap-2">
                                                                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-azam-blue border-blue-100 font-bold whitespace-nowrap">
                                                                            {pages.length} Pages
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </CollapsibleTrigger>
                                                            <CollapsibleContent className="bg-slate-50/40">
                                                                {pages.map((page) => (
                                                                    <div
                                                                        key={page.pageId}
                                                                        className={`grid grid-cols-12 gap-4 px-6 py-2.5 items-center border-b border-slate-100 last:border-0 hover:bg-white transition-all ${page.status === "INACTIVE" ? "opacity-50" : ""}`}
                                                                    >
                                                                        <div className="col-span-12 md:col-span-5 pl-10 flex flex-col justify-center min-w-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                                                <span className="text-sm text-slate-700 font-semibold truncate">
                                                                                    {page.pageMenuLabel || page.pageSubMenu || page.pageMenu}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pl-3.5 mt-0.5">
                                                                                <span className="bg-slate-100 px-1 rounded border border-slate-200" title="Page ID">PID: {page.pageId}</span>
                                                                                {page.navPageId && (
                                                                                    <span className="bg-indigo-50 text-indigo-600 px-1 rounded border border-indigo-100" title="Navigation Page ID">NID: {page.navPageId}</span>
                                                                                )}
                                                                                {page.parentNavPageId && (
                                                                                    <span className="bg-blue-50 text-blue-600 px-1 rounded border border-blue-100" title="Parent Nav ID">PNID: {page.parentNavPageId}</span>
                                                                                )}
                                                                                <span className="truncate ml-1 opacity-70">{page.pageUrl}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-span-3 md:col-span-1 flex justify-center py-2 md:py-0">
                                                                            <div className="flex flex-col items-center gap-1 md:block">
                                                                                <span className="text-[9px] font-bold text-slate-400 uppercase md:hidden">View</span>
                                                                                <Checkbox
                                                                                    checked={page.viewAccess}
                                                                                    onCheckedChange={(checked) => updatePermission(page.pageId, "viewAccess", !!checked)}
                                                                                    className="data-[state=checked]:bg-azam-blue data-[state=checked]:border-azam-blue h-5 w-5"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-span-3 md:col-span-1 flex justify-center py-2 md:py-0">
                                                                            <div className="flex flex-col items-center gap-1 md:block">
                                                                                <span className="text-[9px] font-bold text-slate-400 uppercase md:hidden">Add</span>
                                                                                <Checkbox
                                                                                    checked={page.addAccess}
                                                                                    onCheckedChange={(checked) => updatePermission(page.pageId, "addAccess", !!checked)}
                                                                                    className="data-[state=checked]:bg-azam-blue data-[state=checked]:border-azam-blue h-5 w-5"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-span-3 md:col-span-1 flex justify-center py-2 md:py-0">
                                                                            <div className="flex flex-col items-center gap-1 md:block">
                                                                                <span className="text-[9px] font-bold text-slate-400 uppercase md:hidden">Edit</span>
                                                                                <Checkbox
                                                                                    checked={page.editAccess}
                                                                                    onCheckedChange={(checked) => updatePermission(page.pageId, "editAccess", !!checked)}
                                                                                    className="data-[state=checked]:bg-azam-blue data-[state=checked]:border-azam-blue h-5 w-5"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-span-3 md:col-span-1 flex justify-center py-2 md:py-0">
                                                                            <div className="flex flex-col items-center gap-1 md:block">
                                                                                <span className="text-[9px] font-bold text-slate-400 uppercase md:hidden">Export</span>
                                                                                <Checkbox
                                                                                    checked={page.exportAccess}
                                                                                    onCheckedChange={(checked) => updatePermission(page.pageId, "exportAccess", !!checked)}
                                                                                    className="data-[state=checked]:bg-azam-blue data-[state=checked]:border-azam-blue h-5 w-5"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-span-3 md:col-span-1 flex justify-center py-2 md:py-0">
                                                                            <div className="flex flex-col items-center gap-1 md:block">
                                                                                <span className="text-[9px] font-bold text-slate-400 uppercase md:hidden">Status</span>
                                                                                <Checkbox
                                                                                    checked={page.status === "ACTIVE"}
                                                                                    onCheckedChange={(checked) => {
                                                                                        setPermissions(prev => prev.map(p =>
                                                                                            p.pageId === page.pageId ? { ...p, status: checked ? "ACTIVE" : "INACTIVE" } : p
                                                                                        ));
                                                                                        setHasChanges(true);
                                                                                    }}
                                                                                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 h-5 w-5"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-span-12 md:col-span-2 flex justify-end items-center gap-2 pr-2">
                                                                            <div className="hidden md:flex flex-col items-end">
                                                                                {page.status === "ACTIVE" ? (
                                                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                                                                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                                                        <span className="text-[9px] font-bold text-emerald-700 uppercase">Active</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-200">
                                                                                        <div className="w-1 h-1 rounded-full bg-slate-400" />
                                                                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Inactive</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </CollapsibleContent>
                                                        </Collapsible>
                                                    ))}

                                                    {Object.keys(filteredGroupedPages).length === 0 && (
                                                        <div className="py-20 text-center">
                                                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                                <Search className="w-8 h-8 text-slate-300" />
                                                            </div>
                                                            <h3 className="text-slate-900 font-semibold">No pages found</h3>
                                                            <p className="text-slate-500 text-sm mt-1">Try adjusting your search criteria</p>
                                                            <Button
                                                                variant="link"
                                                                onClick={() => setPermissionSearchQuery("")}
                                                                className="text-azam-blue mt-2"
                                                            >
                                                                Clear Search
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>

                        </div>
                    )}
                </Card>

                <RoleFormDialog
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    role={editingRole}
                    onSave={handleSave}
                    existingRoles={roles}
                />

                <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {deleteId && roles.find(r => r.roleId === deleteId)?.status === "ACTIVE"
                                    ? `This action will deactivate the role "${roles.find(r => r.roleId === deleteId)?.roleName}".`
                                    : `This action will activate the role "${roles.find(r => r.roleId === deleteId)?.roleName}".`
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    if (deleteId) handleDeactivate(deleteId);
                                }}
                                className={deleteId && roles.find(r => r.roleId === deleteId)?.status === "ACTIVE"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                                }
                            >
                                {deleteId && roles.find(r => r.roleId === deleteId)?.status === "ACTIVE"
                                    ? "Deactivate Role"
                                    : "Activate Role"
                                }
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
