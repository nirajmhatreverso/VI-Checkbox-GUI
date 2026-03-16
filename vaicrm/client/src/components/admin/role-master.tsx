import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { RoleFormDialog } from "./role-form-dialog";
import { Plus, Search, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import {
    useRoles,
    useCreateRoleMutation,
    useUpdateRoleMutation,
    useDeleteRoleMutation,
    type Role,
    type RoleStatus
} from "@/hooks/use-role-master";

// RoleMaster component using real data from API
export function RoleMaster() {
    const { toast } = useToast();
    const { data: roles = [], isLoading: isRolesLoading = true } = useRoles();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<RoleStatus | "ALL">("ALL");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const createRoleMutation = useCreateRoleMutation();
    const updateRoleMutation = useUpdateRoleMutation();
    const deleteRoleMutation = useDeleteRoleMutation();

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

    const columns: ColumnDef<Role>[] = [
        {
            accessorKey: "roleId",
            header: "Role ID",
            cell: ({ row }) => (
                <span className="font-mono text-xs text-slate-500">
                    {row.original.roleId}
                </span>
            ),
        },
        {
            accessorKey: "roleName",
            header: "Role Name",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <i className="pi pi-shield text-indigo-600" />
                    <span className="font-medium text-slate-900">
                        {row.original.roleName}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.status;
                return status === "ACTIVE" ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactive
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(row.original)}
                        className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(row.original.roleId)}
                        className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Deactivate
                    </Button>
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: filteredRoles,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {
            sorting,
        },
    });

    const handleAdd = () => {
        setEditingRole(null);
        setIsFormOpen(true);
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            // Check if role is assigned to users (should be an API call)
            const isAssigned = false;

            if (isAssigned) {
                toast({
                    title: "Cannot Deactivate Role",
                    description: "This role is currently assigned to users and cannot be deactivated.",
                    variant: "destructive",
                });
                setDeleteId(null);
                return;
            }

            const roleToDeactivate = roles.find(r => r.roleId === id);
            if (!roleToDeactivate) return;

            const response = await deleteRoleMutation.mutateAsync(roleToDeactivate);
            setDeleteId(null);
            const successMsg = response?.statusMessage || "Role has been deactivated successfully.";
            toast({
                title: "Success",
                description: successMsg,
            });
        } catch (error: any) {
            const errorMsg = error?.response?.data?.statusMessage || error?.statusMessage || error?.message || "An error occurred while deactivating the role.";
            toast({
                title: "Deactivate Failed",
                description: errorMsg,
                variant: "destructive",
            });
        }
    };

    const handleSave = async (role: Role) => {
        try {
            let response: any;
            if (editingRole) {
                response = await updateRoleMutation.mutateAsync({ role });
                const successMsg = response?.statusMessage || "Role updated successfully";
                toast({
                    title: "Success",
                    description: successMsg,
                });
            } else {
                const { roleId, ...roleData } = role;
                response = await createRoleMutation.mutateAsync(roleData);
                const successMsg = response?.statusMessage || "Role created successfully";
                toast({
                    title: "Success",
                    description: successMsg,
                });
            }
            setIsFormOpen(false);
            setEditingRole(null);
        } catch (error: any) {
            const errorMsg = error?.response?.data?.statusMessage || error?.statusMessage || error?.message || "Failed to save role";
            toast({
                title: "Error",
                description: errorMsg,
                variant: "destructive",
            });
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-azam-blue to-blue-700 p-3">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-white flex items-center">
                        <i className="pi pi-users mr-2 text-sm" />
                        Roles
                    </h3>
                    <Button
                        onClick={handleAdd}
                        className="bg-white text-azam-blue hover:bg-blue-50 shadow-lg h-8 text-sm"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Role
                    </Button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search roles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white/90 border-white/20 focus:bg-white h-7"
                        />
                    </div>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) =>
                            setStatusFilter(value as RoleStatus | "ALL")
                        }
                    >
                        <SelectTrigger className="bg-white/90 border-white/20 focus:bg-white h-7">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="p-6 relative">
                {isRolesLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-azam-blue border-t-transparent" />
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Loading Roles...</p>
                        </div>
                    </div>
                )}
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-slate-50">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="font-semibold">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center text-slate-500"
                                    >
                                        No roles found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4 text-sm text-slate-600">
                    Showing {filteredRoles.length} of {roles.length} roles
                </div>
            </div>

            {/* Form Dialog */}
            <RoleFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                role={editingRole}
                onSave={handleSave}
                existingRoles={roles}
            />

            {/* Deactivate Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !deleteRoleMutation.isPending && !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently deactivate the role
                            from the system. Make sure no users are assigned to this role.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteRoleMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteId) handleDelete(deleteId);
                            }}
                            disabled={deleteRoleMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteRoleMutation.isPending ? "Deactivating..." : "Deactivate"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
