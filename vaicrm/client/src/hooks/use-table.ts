// === TABLE HOOK ===
// Reusable hook for table functionality

import { useState, useMemo } from 'react';
import { TableColumn } from '@shared/types';

export interface UseTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  searchableFields?: (keyof T)[];
  initialPageSize?: number;
}

export interface SortConfig<T> {
  key: keyof T | null;
  direction: 'asc' | 'desc';
}

export function useTable<T extends Record<string, any>>({
  data,
  columns,
  searchableFields = [],
  initialPageSize = 10,
}: UseTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: null,
    direction: 'asc',
  });
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;

    return data.filter((item) =>
      searchableFields.some((field) => {
        const value = item[field];
        return value
          ?.toString()
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      })
    );
  }, [data, searchQuery, searchableFields]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        const comparison = aValue.getTime() - bValue.getTime();
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Fallback to string comparison
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Calculate pagination
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Calculate progress
  const progress = totalItems > 0 ? (currentPage / totalPages) * 100 : 0;

  // Pagination functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Sort function
  const handleSort = (key: keyof T) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Reset all filters and pagination
  const resetFilters = () => {
    setSearchQuery('');
    setSortConfig({ key: null, direction: 'asc' });
    setCurrentPage(1);
    setSelectedRows(new Set());
  };

  // Selection functions
  const selectRow = (id: string | number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRows(newSelection);
  };

  const selectAllRows = () => {
    const allIds = paginatedData.map((item) => item.id);
    setSelectedRows(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const isRowSelected = (id: string | number) => selectedRows.has(id);
  const isAllSelected = paginatedData.length > 0 && 
    paginatedData.every((item) => selectedRows.has(item.id));

  // Can navigate functions
  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  return {
    // Data
    filteredData,
    sortedData,
    paginatedData,
    
    // Pagination state
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    progress,
    
    // Search and sort state
    searchQuery,
    sortConfig,
    
    // Selection state
    selectedRows,
    isRowSelected,
    isAllSelected,
    
    // Functions
    setSearchQuery,
    setPageSize,
    setCurrentPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPrevPage,
    handleSort,
    resetFilters,
    selectRow,
    selectAllRows,
    clearSelection,
    
    // Computed values
    canGoNext,
    canGoPrev,
  };
}