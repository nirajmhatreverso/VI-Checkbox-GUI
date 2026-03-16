// === REUSABLE DATA TABLE COMPONENT ===
// Enhanced table component with TanStack React Table implementation

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { LoadingCard } from "@/components/ui/loading-spinner";

export interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface DataTableAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  variant?: "default" | "destructive";
  show?: (item: T) => boolean;
}

export interface DataTableProps<T> {
  title?: string;
  subtitle?: string;
  headerVariant?: "plain" | "gradient";
  customHeader?: React.ReactNode;
  showCount?: boolean;
  totalCount?: number;
  data: T[];
  columns: DataTableColumn<T>[];
  searchableFields?: (keyof T)[];
  loading?: boolean;
  error?: string;
  actions?: DataTableAction<T>[];
  emptyMessage?: string;
  className?: string;
  onRefresh?: () => void;
  enableExport?: boolean;
  icon?: React.ReactNode;
  hideHeader?: boolean;     // ← hide the entire CardHeader (title, search, toolbar)

  // Manual (server-side) pagination (optional)
  manualPagination?: boolean;
  pageIndex?: number; // zero-based
  pageSize?: number;
  pageCount?: number; // total pages
  onPageChange?: (pageIndex: number) => void; // zero-based
  onPageSizeChange?: (pageSize: number) => void;
  toolbarContent?: React.ReactNode;
  filterChips?: React.ReactNode;
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
    case "approved":
    case "completed":
    case "success":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
    case "processing":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "inactive":
    case "draft":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "suspended":
    case "rejected":
    case "failed":
    case "error":
      return "bg-red-100 text-red-800 border-red-200";
    case "cancelled":
    case "blocked":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// Simple mobile detection hook (no dependency)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const handleResize = useCallback(() => setIsMobile(typeof window !== "undefined" ? window.innerWidth < 768 : false), []);
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);
  return isMobile;
}

export function DataTable<T extends Record<string, any>>({
  title = "Data Table",
  subtitle,
  headerVariant = "plain",
  showCount = false,
  totalCount,
  data,
  columns,
  searchableFields = [],
  loading = false,
  error,
  actions = [],
  emptyMessage = "No data available",
  className = "",
  onRefresh,
  enableExport = true,
  icon,
  hideHeader = false,

  // Manual pagination
  manualPagination = false,
  pageIndex: externalPageIndex,
  pageSize: externalPageSize,
  pageCount: externalPageCount,
  onPageChange,
  onPageSizeChange,
  toolbarContent,
  filterChips,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Internal pagination state for client-side pagination
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    setHasSearched(Boolean(globalFilter.trim()));
  }, [globalFilter]);

  // Reset pagination when data changes (for client-side pagination)
  useEffect(() => {
    if (!manualPagination) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }
  }, [data.length, manualPagination]);

  const handleExport = () => {
    if (!enableExport) return;
    const visibleData = table.getFilteredRowModel().rows.map((row) => row.original);
    const headers = columns.map((col) => col.label);
    const csvContent = [headers.join(",")]
      .concat(
        visibleData.map((item) =>
          columns.map((col) => `"${String(item[col.key] ?? "").replace(/"/g, '""')}"`).join(",")
        )
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined && document.body) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${title.toLowerCase().replace(/\s+/g, "_")}_export_${new Date()
          .toISOString()
          .split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const columnHelper = createColumnHelper<T>();

  const tanstackColumns = useMemo<ColumnDef<T, any>[]>(
    () => [
      ...columns.map((column) =>
        columnHelper.accessor(column.key as any, {
          header: column.label,
          cell: (info) => {
            const value = info.getValue();

            if (column.render) return column.render(value, info.row.original);

            if (typeof value === "boolean") {
              return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
            }

            if (column.key.toString().includes("status") && typeof value === "string") {
              return <Badge className={`${getStatusColor(value)} text-xs`}>{value.replaceAll("_", " ")}</Badge>;
            }

            if (typeof value === "number" && column.key.toString().includes("amount")) {
              return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "TZS",
              }).format(value);
            }

            if (value && typeof value === "string" && isNaN(Number(value)) && !isNaN(Date.parse(value))) {
              return new Date(value).toLocaleDateString();
            }

            return value?.toString() || "-";
          },
          enableSorting: column.sortable !== false,
        })
      ),
      ...(actions.length > 0
        ? [
          columnHelper.display({
            id: "actions",
            header: "Actions",
            cell: (info) => (
              <div className="flex items-center space-x-2">
                {actions
                  .filter((action) => !action.show || action.show(info.row.original))
                  .map((action, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="iconSm"
                      onClick={() => action.onClick(info.row.original)}
                      title={action.label}
                      aria-label={action.label}
                    >
                      {action.icon ?? <span className="sr-only">{action.label}</span>}
                    </Button>
                  ))}
              </div>
            ),
          }),
        ]
        : []),
    ],
    [columns, actions]
  );

  const table = useReactTable({
    data: data || [],
    columns: tanstackColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination: manualPagination
        ? { pageIndex: externalPageIndex ?? 0, pageSize: externalPageSize ?? 10 }
        : pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: manualPagination
      ? (updater) => {
        const prev = {
          pageIndex: externalPageIndex ?? 0,
          pageSize: externalPageSize ?? 10,
        };
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (next.pageSize !== prev.pageSize) onPageSizeChange?.(next.pageSize);
        if (next.pageIndex !== prev.pageIndex) onPageChange?.(next.pageIndex);
      }
      : setPagination,

    manualPagination,
    pageCount: manualPagination ? externalPageCount ?? -1 : undefined,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const isMobile = useIsMobile();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <LoadingCard message="Loading data..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="text-center text-red-600">
            <p>Error loading data: {error}</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4" aria-label="Retry loading">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const countToShow = totalCount ?? data.length;

  const currPageIndex = manualPagination ? externalPageIndex ?? 0 : table.getState().pagination.pageIndex;
  const currPageSize = manualPagination ? externalPageSize ?? 10 : table.getState().pagination.pageSize;
  const totalPages = manualPagination ? externalPageCount ?? 1 : table.getPageCount();
  const canPrev = manualPagination ? currPageIndex > 0 : table.getCanPreviousPage();
  const canNext = manualPagination ? currPageIndex < totalPages - 1 : table.getCanNextPage();

  // Get paginated data for mobile view
  const paginatedRows = table.getRowModel().rows;

  return (
    <Card className={className + " border-0 shadow-none"}>
      {!hideHeader && (
        <CardHeader
          className={
            headerVariant === "gradient"
              ? "pb-4 text-white bg-gradient-to-r from-azam-blue to-blue-700 rounded-t-md"
              : "pb-4"
          }
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-2 lg:space-y-0">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {icon && <span>{icon}</span>}
                <span>{title}</span>
                {showCount && (
                  <Badge
                    className={
                      headerVariant === "gradient"
                        ? "bg-white/20 text-white border border-white/20"
                        : "bg-azam-blue/10 text-azam-blue border-azam-blue/20"
                    }
                  >
                    {countToShow} Records
                  </Badge>
                )}
              </CardTitle>
              {subtitle && (
                <p
                  className={
                    headerVariant === "gradient"
                      ? "text-xs text-blue-100 mt-1"
                      : "text-xs text-muted-foreground mt-1"
                  }
                >
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {toolbarContent}
              {onRefresh && (
                <Button
                  variant={headerVariant === "gradient" ? "secondary" : "outline"}
                  size="xs"
                  onClick={onRefresh}
                  aria-label="Refresh table"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              )}
              {enableExport && (
                <Button
                  variant={headerVariant === "gradient" ? "secondary" : "outline"}
                  size="xs"
                  onClick={handleExport}
                  aria-label="Export table"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>

          {searchableFields.length > 0 && (
            <div className="mt-4">
              <div className="max-w-sm">
                <Input
                  uiSize="sm"
                  leftIcon={<Search className="h-4 w-4" />}
                  placeholder={`Search ${searchableFields.join(", ")}...`}
                  value={globalFilter ?? ""}
                  onChange={(event) => setGlobalFilter(String(event.target.value))}
                  aria-label="Global search"
                />
              </div>
            </div>
          )}

          {filterChips && <div className="mt-2 flex flex-wrap gap-2">{filterChips}</div>}
        </CardHeader>
      )}

      <CardContent className="px-0 pt-0">
        {/* Mobile: Card view */}
        {isMobile ? (
          <div className="space-y-3">
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row) => {
                const item = row.original;
                return (
                  <Card key={row.id} className="border-l-4 border-l-azam-blue">
                    <CardContent className="py-4">
                      <div className="flex flex-col gap-1">
                        {columns.map((col) => (
                          <div key={col.key as string} className="flex justify-between text-xs py-0.5">
                            <span className="font-semibold text-gray-700">{col.label}:</span>
                            <span className="text-gray-900">
                              {col.render
                                ? col.render(item[col.key], item)
                                : String(item[col.key] ?? "-")}
                            </span>
                          </div>
                        ))}
                        {actions && actions.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {actions
                              .filter((action) => !action.show || action.show(item))
                              .map((action, index) => (
                                <Button
                                  key={index}
                                  variant={action.variant || "ghost"}
                                  size="iconSm"
                                  onClick={() => action.onClick(item)}
                                  title={action.label}
                                  aria-label={action.label}
                                >
                                  {action.icon ?? <span className="sr-only">{action.label}</span>}
                                </Button>
                              ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-8">
                {hasSearched ? "No items match your search criteria." : emptyMessage}
              </div>
            )}
            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <>
                <div className="flex justify-between items-center mt-4">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => table.previousPage()}
                    disabled={!canPrev}
                    className="mx-1"
                  >
                    Prev
                  </Button>
                  <span className="text-xs mx-2 mt-1">
                    Page {currPageIndex + 1} of {totalPages}
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => table.nextPage()}
                    disabled={!canNext}
                    className="mx-1"
                  >
                    Next
                  </Button>
                </div>
                <div className="flex items-center justify-end gap-2 text-xs mt-2">
                  <span className="text-gray-600">Rows:</span>
                  <Select
                    value={String(currPageSize)}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger uiSize="sm" className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 30, 40, 50].map((ps) => (
                        <SelectItem key={ps} value={`${ps}`}>
                          {ps}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        ) : (
          // Desktop/tablet: Table view
          <>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className={
                        headerVariant === "gradient"
                          ? "border-b bg-gradient-to-r from-azam-blue/10 to-blue-50"
                          : "border-b bg-muted/50"
                      }
                    >
                      {headerGroup.headers.map((header) => {
                        const sortable = header.column.getCanSort();
                        const isSorted = header.column.getIsSorted();
                        return (
                          <th
                            key={header.id}
                            className={`h-12 px-4 text-left align-middle font-semibold uppercase tracking-wider text-[11px] ${isSorted ? "text-azam-blue" : "text-muted-foreground"
                              }`}
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                className={`flex items-center gap-2 ${sortable ? "cursor-pointer select-none" : ""
                                  }`}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                <span>
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                </span>
                                {sortable && (
                                  <span>
                                    {isSorted ? (
                                      isSorted === "desc" ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronUp className="h-4 w-4" />
                                      )
                                    ) : (
                                      <ChevronsUpDown className="h-4 w-4 text-muted-foreground/70" />
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>

                <tbody>
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row) => (
                      <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="border border-gray-200 px-4 py-3 text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={tanstackColumns.length} className="h-24 text-center">
                        {hasSearched ? "No items match your search criteria." : emptyMessage}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground" />
                <div className="flex items-center space-x-6 lg:space-x-8">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                      value={String(currPageSize)}
                      onValueChange={(value) => {
                        const size = Number(value);
                        if (manualPagination) {
                          onPageSizeChange?.(size);
                        } else {
                          table.setPageSize(size);
                        }
                      }}
                    >
                      <SelectTrigger uiSize="sm" className="w-[70px]">
                        <SelectValue placeholder={currPageSize} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((ps) => (
                          <SelectItem key={ps} value={`${ps}`}>
                            {ps}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-3 whitespace-nowrap">
                      Page {currPageIndex + 1} of {totalPages}
                    </span>

                    <Pagination className="py-0">
                      <PaginationContent>
                        <PaginationItem className="hidden lg:list-item">
                          <PaginationLink
                            aria-label="First page"
                            disabled={!canPrev}
                            onClick={() => {
                              if (manualPagination) {
                                onPageChange?.(0);
                              } else {
                                table.setPageIndex(0);
                              }
                            }}
                          >
                            «
                          </PaginationLink>
                        </PaginationItem>

                        <PaginationItem>
                          <PaginationPrevious
                            disabled={!canPrev}
                            onClick={() => {
                              if (manualPagination) {
                                onPageChange?.(Math.max(0, currPageIndex - 1));
                              } else {
                                table.previousPage();
                              }
                            }}
                          />
                        </PaginationItem>

                        <PaginationItem>
                          <PaginationNext
                            disabled={!canNext}
                            onClick={() => {
                              if (manualPagination) {
                                onPageChange?.(Math.min(totalPages - 1, currPageIndex + 1));
                              } else {
                                table.nextPage();
                              }
                            }}
                          />
                        </PaginationItem>

                        <PaginationItem className="hidden lg:list-item">
                          <PaginationLink
                            aria-label="Last page"
                            disabled={!canNext}
                            onClick={() => {
                              if (manualPagination) {
                                onPageChange?.(Math.max(0, totalPages - 1));
                              } else {
                                table.setPageIndex(table.getPageCount() - 1);
                              }
                            }}
                          >
                            »
                          </PaginationLink>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}