import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Save, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRoles, useRolePermissions } from "@/hooks/use-role-master";

interface PagePermission {
    pageId: string;
    pageMenu: string;
    pageSubMenu: string | null;
    pageSectionName: string | null;
    status: "ACTIVE" | "INACTIVE";
    viewAccess: boolean;
    addAccess: boolean;
    editAccess: boolean;
    exportAccess: boolean;
}

interface RoleMapping {
    roleId: string;
    permissions: PagePermission[];
}

export function RolePageMapping() {
    const { toast } = useToast();
    const { data: roles = [] } = useRoles();
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");
    const { data: rolePermissions = [], isLoading: isLoadingPermissions } = useRolePermissions(selectedRoleId);
    const [permissions, setPermissions] = useState<PagePermission[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Load permissions when role is selected
    useEffect(() => {
        if (selectedRoleId) {
            setPermissions(rolePermissions);
            setHasChanges(false);
        } else {
            setPermissions([]);
        }
    }, [selectedRoleId, rolePermissions]);

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

    const toggleAllView = () => {
        const allEnabled = permissions.every((p) => p.viewAccess);
        setPermissions((prev) =>
            prev.map((p) => ({
                ...p,
                viewAccess: !allEnabled,
                // Clear dependent flags when turning VIEW off
                ...(!allEnabled ? {} : {
                    addAccess: false,
                    editAccess: false,
                    exportAccess: false
                })
            }))
        );
        setHasChanges(true);
    };

    const toggleAllAdd = () => {
        const allEnabled = permissions.every((p) => p.addAccess);
        setPermissions((prev) =>
            prev.map((p) => ({
                ...p,
                addAccess: !allEnabled,
                viewAccess: !allEnabled ? true : p.viewAccess,
            }))
        );
        setHasChanges(true);
    };

    const toggleAllEdit = () => {
        const allEnabled = permissions.every((p) => p.editAccess);
        setPermissions((prev) =>
            prev.map((p) => ({
                ...p,
                editAccess: !allEnabled,
                viewAccess: !allEnabled ? true : p.viewAccess,
            }))
        );
        setHasChanges(true);
    };

    const toggleAllExport = () => {
        const allEnabled = permissions.every((p) => p.exportAccess);
        setPermissions((prev) =>
            prev.map((p) => ({
                ...p,
                exportAccess: !allEnabled,
                viewAccess: !allEnabled ? true : p.viewAccess,
            }))
        );
        setHasChanges(true);
    };

    const toggleGroupPermission = (
        groupKey: string,
        field: keyof Pick<PagePermission, "viewAccess" | "addAccess" | "editAccess" | "exportAccess">
    ) => {
        const groupPages = groupedPages[groupKey];
        const allEnabled = groupPages.every((p) => p[field]);
        setPermissions((prev) =>
            prev.map((p) => {
                if (p.pageMenu === groupKey) {
                    const updated = { ...p, [field]: !allEnabled };
                    if (!allEnabled && field !== "viewAccess") {
                        updated.viewAccess = true;
                    }
                    if (allEnabled && field === "viewAccess") {
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

    const handleSave = () => {
        // Validate: at least VIEW must be checked before EDIT/ADD/EXPORT
        const invalid = permissions.some(
            (p) =>
                !p.viewAccess && (p.addAccess || p.editAccess || p.exportAccess)
        );
        if (invalid) {
            toast({
                title: "Validation Error",
                description: "VIEW access must be enabled before granting other permissions.",
                variant: "destructive",
            });
            return;
        }

        // Save to API

        toast({
            title: "Success",
            description: "Role permissions have been updated successfully.",
        });
        setHasChanges(false);
    };

    const allViewEnabled = permissions.length > 0 && permissions.every((p) => p.viewAccess);
    const allAddEnabled = permissions.length > 0 && permissions.every((p) => p.addAccess);
    const allEditEnabled = permissions.length > 0 && permissions.every((p) => p.editAccess);
    const allExportEnabled = permissions.length > 0 && permissions.every((p) => p.exportAccess);

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-azam-blue to-blue-700 p-3">
                <h3 className="text-base font-semibold text-white flex items-center mb-2">
                    <i className="pi pi-shield mr-2 text-sm" />
                    Role–Page Mapping
                </h3>

                {/* Role Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Select Role *
                        </label>
                        <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                            <SelectTrigger className="bg-white/90 border-white/20 focus:bg-white">
                                <SelectValue placeholder="Choose a role..." />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map((role) => (
                                    <SelectItem key={role.roleId} value={role.roleId}>
                                        <div className="flex items-center gap-2">
                                            <i className="pi pi-shield text-azam-blue" />
                                            {role.roleName}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Quick Toggles */}
                    {selectedRoleId && (
                        <div className="flex items-end gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={toggleAllView}
                                className="bg-white/90 hover:bg-white border-white/20"
                            >
                                {allViewEnabled ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                                All View
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={toggleAllAdd}
                                className="bg-white/90 hover:bg-white border-white/20"
                            >
                                {allAddEnabled ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                                All Add
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={toggleAllEdit}
                                className="bg-white/90 hover:bg-white border-white/20"
                            >
                                {allEditEnabled ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                                All Edit
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={toggleAllExport}
                                className="bg-white/90 hover:bg-white border-white/20"
                            >
                                {allExportEnabled ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                                All Export
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6">
                {!selectedRoleId ? (
                    <div className="text-center py-16 text-slate-500">
                        <i className="pi pi-info-circle text-4xl mb-4 block" />
                        <p className="text-lg">Please select a role to manage permissions</p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="h-[calc(100vh-400px)]">
                            <div className="rounded-lg border border-slate-200 overflow-hidden">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-slate-50 z-10">
                                        <TableRow>
                                            <TableHead className="font-semibold w-[200px]">
                                                Page Menu
                                            </TableHead>
                                            <TableHead className="font-semibold w-[200px]">
                                                Sub Menu
                                            </TableHead>
                                            <TableHead className="text-center font-semibold w-[120px]">
                                                View
                                            </TableHead>
                                            <TableHead className="text-center font-semibold w-[120px]">
                                                Add
                                            </TableHead>
                                            <TableHead className="text-center font-semibold w-[120px]">
                                                Edit
                                            </TableHead>
                                            <TableHead className="text-center font-semibold w-[120px]">
                                                Export
                                            </TableHead>
                                            <TableHead className="font-semibold w-[100px]">
                                                Status
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(groupedPages).map(([groupKey, pages]) => {
                                            const groupViewEnabled = pages.every((p) => p.viewAccess);
                                            const groupAddEnabled = pages.every((p) => p.addAccess);
                                            const groupEditEnabled = pages.every((p) => p.editAccess);
                                            const groupExportEnabled = pages.every((p) => p.exportAccess);

                                            return (
                                                <React.Fragment key={`group-${groupKey}`}>
                                                    {/* Group Header */}
                                                    <TableRow
                                                        className="bg-indigo-50 hover:bg-indigo-100"
                                                    >
                                                        <TableCell className="font-semibold text-indigo-900">
                                                            <i className="pi pi-folder-open mr-2" />
                                                            {groupKey}
                                                        </TableCell>
                                                        <TableCell />
                                                        <TableCell className="text-center">
                                                            <Checkbox
                                                                checked={groupViewEnabled}
                                                                onCheckedChange={() =>
                                                                    toggleGroupPermission(groupKey, "viewAccess")
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Checkbox
                                                                checked={groupAddEnabled}
                                                                onCheckedChange={() =>
                                                                    toggleGroupPermission(groupKey, "addAccess")
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Checkbox
                                                                checked={groupEditEnabled}
                                                                onCheckedChange={() =>
                                                                    toggleGroupPermission(groupKey, "editAccess")
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Checkbox
                                                                checked={groupExportEnabled}
                                                                onCheckedChange={() =>
                                                                    toggleGroupPermission(groupKey, "exportAccess")
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell />
                                                    </TableRow>

                                                    {/* Group Items */}
                                                    {pages.map((page) => (
                                                        <TableRow
                                                            key={page.pageId}
                                                            className={`hover:bg-slate-50 ${page.status === "INACTIVE" ? "opacity-50" : ""
                                                                }`}
                                                        >
                                                            <TableCell>
                                                                <span className="font-medium text-slate-700">
                                                                    {page.pageMenu}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                {page.pageSubMenu ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <i className="pi pi-angle-right text-slate-400 text-xs" />
                                                                        <span className="text-sm text-slate-600">
                                                                            {page.pageSubMenu}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-400 text-sm">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Checkbox
                                                                    checked={page.viewAccess}
                                                                    onCheckedChange={(checked) =>
                                                                        updatePermission(
                                                                            page.pageId,
                                                                            "viewAccess",
                                                                            !!checked
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Checkbox
                                                                    checked={page.addAccess}
                                                                    onCheckedChange={(checked) =>
                                                                        updatePermission(
                                                                            page.pageId,
                                                                            "addAccess",
                                                                            !!checked
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Checkbox
                                                                    checked={page.editAccess}
                                                                    onCheckedChange={(checked) =>
                                                                        updatePermission(
                                                                            page.pageId,
                                                                            "editAccess",
                                                                            !!checked
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Checkbox
                                                                    checked={page.exportAccess}
                                                                    onCheckedChange={(checked) =>
                                                                        updatePermission(
                                                                            page.pageId,
                                                                            "exportAccess",
                                                                            !!checked
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                {page.status === "INACTIVE" && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="bg-yellow-50 text-yellow-700 border-yellow-200"
                                                                    >
                                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                                        Inactive
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </ScrollArea>

                        {/* Save Button */}
                        <div className="mt-6 flex items-center justify-between">
                            <div className="text-sm text-slate-600">
                                {hasChanges && (
                                    <span className="text-amber-600 font-medium">
                                        <i className="pi pi-exclamation-circle mr-1" />
                                        You have unsaved changes
                                    </span>
                                )}
                            </div>
                            <Button
                                onClick={handleSave}
                                disabled={!hasChanges}
                                className="bg-gradient-to-r from-azam-blue to-blue-700 hover:from-blue-600 hover:to-blue-800"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Mapping
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
