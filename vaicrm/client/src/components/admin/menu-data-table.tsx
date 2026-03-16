import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MenuItem } from "./menu-master";
import { MoreVertical, Edit, Copy, Trash2, Download, CheckCircle, XCircle, ArrowUpDown } from "lucide-react";

interface MenuDataTableProps {
    data: MenuItem[];
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    onBulkAction: (action: "activate" | "deactivate", ids: string[]) => void;
}

export function MenuDataTable({ data, onEdit, onDelete, onBulkAction }: MenuDataTableProps) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: "pageMenuOrder", desc: false },
    ]);
    const [rowSelection, setRowSelection] = useState({});
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const columns: ColumnDef<MenuItem>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
        },
        {
            accessorKey: "pageId",
            header: "ID",
            cell: ({ row }) => (
                <span className="font-mono text-xs text-slate-500">
                    {row.original.pageId}
                </span>
            ),
        },
        {
            accessorKey: "menuType",
            header: "Type",
            cell: ({ row }) => {
                const type = row.original.menuType;
                const colors: Record<string, string> = {
                    LOGO: "bg-purple-100 text-purple-700 border-purple-200",
                    NAV: "bg-blue-100 text-blue-700 border-blue-200",
                    SECTION: "bg-green-100 text-green-700 border-green-200",
                };
                const fallback = "bg-gray-100 text-gray-700 border-gray-200";
                const className = colors[type] ?? fallback;
                return (
                    <Badge variant="outline" className={className}>
                        {type}
                    </Badge>
                );
            },
        },
        {
            id: "pageMenu",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="hover:bg-slate-100"
                >
                    Menu
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const isSection = row.original.menuType === "SECTION";
                // If it's a section, the 'parent' menu name is stored in pageSectionName (usually) or inferred.
                // Based on my logic: NAV items -> pageMenu is layout. SECTION -> pageSectionName is parent.
                const menuName = isSection ? row.original.pageSectionName : row.original.pageMenu;
                const icon = isSection ? "0" : row.original.pageMenuIcon; // Only show icon for Parent Menu here
                const hasIcon = icon && icon !== "0";

                return (
                    <div className="flex items-center gap-2">
                        {(!isSection && hasIcon) && (
                            <div className="flex items-center gap-1">
                                <i className="pi pi-folder text-azam-blue" />
                                <span className="text-[10px] text-slate-400">({icon})</span>
                            </div>
                        )}
                        <span className="font-medium">{menuName || "-"}</span>
                    </div>
                );
            },
        },
        {
            id: "pageSubMenu",
            header: "Sub Menu",
            cell: ({ row }) => {
                const isSection = row.original.menuType === "SECTION";
                if (!isSection) return <span className="text-slate-400">—</span>;

                const subMenu = row.original.pageMenu;
                const icon = row.original.pageMenuIcon;
                const hasIcon = icon && icon !== "0";

                return (
                    <div className="flex items-center gap-2">
                        {(hasIcon) && (
                            <div className="flex items-center gap-1">
                                <i className="pi pi-file text-blue-500 text-sm" />
                                <span className="text-[10px] text-slate-400">({icon})</span>
                            </div>
                        )}
                        <span className="text-sm">{subMenu}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "pageMenuLabel",
            header: "Label",
            cell: ({ row }) => (
                <span className="text-sm text-slate-600">
                    {row.original.pageMenuLabel}
                </span>
            ),
        },
        {
            accessorKey: "pageUrl",
            header: "URL",
            cell: ({ row }) => {
                const url = row.original.pageUrl;
                return (
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {url}
                    </code>
                );
            },
        },
        {
            accessorKey: "pageMenuOrder",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="hover:bg-slate-100"
                >
                    Order
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="text-center">
                    <span className="font-mono text-sm">
                        {row.original.pageMenuOrder}
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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onEdit(row.original)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem
                            onClick={() => {
                                const duplicate = {
                                    ...row.original,
                                    pageId: `${Date.now()}`,
                                    pageMenu: `${row.original.pageMenu} (Copy)`,
                                };
                                onEdit(duplicate);
                            }}
                        >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                        </DropdownMenuItem> */}
                        {/* <DropdownMenuItem
                            onClick={() => setDeleteId(row.original.pageId)}
                            className="text-red-600 focus:text-red-600"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deactivate
                        </DropdownMenuItem> */}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            rowSelection,
        },
    });

    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows
        .map((row) => row.original.pageId)
        .filter((id): id is string => id !== null);

    const exportToCSV = () => {
        // Helper to escape CSV fields and prevent CSV injection
        const escapeField = (field: string | number | undefined | null): string => {
            if (field === undefined || field === null) return "";
            let str = String(field);
            // Detect formula-triggering characters and prepend single quote to sanitize
            const formulaTriggers = /^[=+\-@\t\r]/;
            if (formulaTriggers.test(str)) {
                str = "'" + str;
            }
            // Wrap in quotes and double-up any internal quotes
            return `"${str.replace(/"/g, '""')}"`;
        };

        const headers = [
            "pageId",
            "menuType",
            "pageSectionName",
            "pageMenu",
            "pageMenuLabel",
            "pageUrl",
            "pageMenuIcon",
            "pageMenuOrder",
            "status",
        ];
        const rows = data.map((item) => [
            escapeField(item.pageId),
            escapeField(item.menuType),
            escapeField(item.pageSectionName || ""),
            escapeField(item.pageMenu),
            escapeField(item.pageMenuLabel),
            escapeField(item.pageUrl),
            escapeField(item.pageMenuIcon),
            escapeField(item.pageMenuOrder),
            escapeField(item.status),
        ]);
        const csv = [headers.map(escapeField), ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `menu-master-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Revoke the object URL after a short delay to ensure download starts
        setTimeout(() => URL.revokeObjectURL(url), 100);
    };

    return (
        <>
            {/* Bulk Actions */}
            {selectedRows.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium text-azam-blue">
                        {selectedRows.length} item(s) selected
                    </span>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBulkAction("activate", selectedIds)}
                            className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Activate
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBulkAction("deactivate", selectedIds)}
                            className="border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                            <XCircle className="w-4 h-4 mr-1" />
                            Deactivate
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={exportToCSV}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                            <Download className="w-4 h-4 mr-1" />
                            Export CSV
                        </Button>
                    </div>
                </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg border border-slate-200 overflow-hidden">
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
                                    data-state={row.getIsSelected() && "selected"}
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
                                    No menu items found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            {/* Mobile Card View */}
            <div className="grid md:hidden gap-4">
                {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => {
                        const item = row.original;
                        const isSection = item.menuType === "SECTION";
                        const menuName = isSection ? item.pageSectionName : item.pageMenu;

                        return (
                            <div key={row.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 overflow-hidden">
                                        <div className="mt-1 shrink-0">
                                            {!isSection && item.pageMenuIcon && item.pageMenuIcon !== "0" ? (
                                                <i className="pi pi-folder text-azam-blue text-lg" />
                                            ) : (
                                                <div className={`w-8 h-8 rounded flex items-center justify-center ${isSection ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    <span className="text-xs font-bold">{item.menuType.charAt(0)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-slate-900 text-base truncate pr-2">
                                                {menuName || "-"}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                    {item.menuType}
                                                </Badge>
                                                {item.status === "ACTIVE" ? (
                                                    <Badge className="text-[10px] h-5 px-1.5 bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 text-slate-600">
                                                        Inactive
                                                    </Badge>
                                                )}
                                                <span className="text-xs text-slate-400">ID: {item.pageId}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => onEdit(row.original)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-500">Label</span>
                                            <span className="text-slate-700 font-medium truncate">{item.pageMenuLabel}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-500">Order</span>
                                            <span className="text-slate-700 font-medium">{item.pageMenuOrder}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 mb-0.5">URL</span>
                                        <code className="text-xs bg-slate-100 px-2 py-1.5 rounded text-slate-700 font-mono break-all">
                                            {item.pageUrl}
                                        </code>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center p-8 bg-white rounded-lg border border-dashed text-slate-500">
                        No menu items found.
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            {/* <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently deactivate the menu
                            item from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteId) onDelete(deleteId);
                                setDeleteId(null);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Deactivate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog> */}
        </>
    );
}
