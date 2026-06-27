'use client';

import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  /** Unique key identifying the column */
  key: string;
  /** Display header label */
  header: string;
  /** Render cell content for a row */
  render: (row: T, index: number) => ReactNode;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Sort comparison function */
  sortFn?: (a: T, b: T) => number;
  /** Column width class (e.g., 'w-32') */
  width?: string;
  /** Alignment */
  align?: 'left' | 'center' | 'right';
  /** Whether this column is hidden on mobile */
  hiddenOnMobile?: boolean;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface DataTableSort {
  key: string;
  direction: SortDirection;
}

export interface DataTableProps<T> {
  /** Array of column definitions */
  columns: DataTableColumn<T>[];
  /** Data rows */
  data: T[];
  /** Unique key extractor for rows */
  getRowKey: (row: T, index: number) => string;
  /** Whether the table is loading */
  loading?: boolean;
  /** Placeholder text for the search filter */
  searchPlaceholder?: string;
  /** Filter function applied on search input */
  filterFn?: (row: T, query: string) => boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Additional className */
  className?: string;
  /** Maximum visible rows before scrolling */
  maxVisibleRows?: number;
  /** Callback when a row is clicked */
  onRowClick?: (row: T, index: number) => void;
  /** Whether to show search filter input */
  searchable?: boolean;
  /** Controlled sort state */
  sort?: DataTableSort;
  /** Callback on sort change */
  onSortChange?: (sort: DataTableSort) => void;
}

/**
 * DataTable — A sortable, filterable data table for dashboards.
 *
 * Design system principles:
 * - 4px grid spacing
 * - Heritage gold accent for interactive elements
 * - Dark/light theme via CSS variables
 * - WCAG AA: keyboard navigation, aria-sort, focus indicators
 * - Responsive: hides columns on mobile via hiddenOnMobile
 */
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  searchPlaceholder = 'Search...',
  filterFn,
  emptyMessage = 'No data available',
  className,
  maxVisibleRows,
  onRowClick,
  searchable = true,
  sort: controlledSort,
  onSortChange,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<DataTableSort>({ key: '', direction: null });
  const [searchQuery, setSearchQuery] = useState('');

  const currentSort = controlledSort ?? internalSort;
  const setSort = onSortChange ?? setInternalSort;

  const handleSort = useCallback(
    (column: DataTableColumn<T>) => {
      if (!column.sortable) return;

      let direction: SortDirection;
      if (currentSort.key === column.key) {
        direction = currentSort.direction === 'asc' ? 'desc' : currentSort.direction === 'desc' ? null : 'asc';
      } else {
        direction = 'asc';
      }
      setSort({ key: column.key, direction });
    },
    [currentSort, setSort]
  );

  const filteredData = useMemo(() => {
    if (!searchQuery || !filterFn) return data;
    return data.filter((row) => filterFn(row, searchQuery));
  }, [data, searchQuery, filterFn]);

  const sortedData = useMemo(() => {
    if (!currentSort.direction || !currentSort.key) return filteredData;
    const column = columns.find((c) => c.key === currentSort.key);
    if (!column?.sortFn) return filteredData;

    const sorted = [...filteredData].sort(column.sortFn);
    return currentSort.direction === 'desc' ? sorted.reverse() : sorted;
  }, [filteredData, currentSort, columns]);

  const visibleData = maxVisibleRows ? sortedData.slice(0, maxVisibleRows) : sortedData;

  if (loading) {
    return (
      <div
        className={cn('rounded-xl border overflow-hidden', className)}
        style={{
          backgroundColor: 'var(--theme-surface-primary)',
          borderColor: 'var(--theme-border-secondary)',
        }}
        role="status"
        aria-label="Loading table data"
      >
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-4 rounded flex-1" style={{ backgroundColor: 'var(--theme-bg-tertiary)' }} />
              <div className="h-4 rounded w-20" style={{ backgroundColor: 'var(--theme-bg-tertiary)' }} />
              <div className="h-4 rounded w-16" style={{ backgroundColor: 'var(--theme-bg-tertiary)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-xl border overflow-hidden', className)}
      style={{
        backgroundColor: 'var(--theme-surface-primary)',
        borderColor: 'var(--theme-border-secondary)',
      }}
    >
      {/* Search filter */}
      {searchable && filterFn && (
        <div
          className="p-3 border-b"
          style={{ borderColor: 'var(--theme-border-secondary)' }}
        >
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--theme-text-muted)' }}
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                'w-full pl-9 pr-8 py-2 rounded-lg text-sm outline-none',
                'focus-visible:ring-2 focus-visible:ring-offset-1 transition-shadow'
              )}
              style={{
                backgroundColor: 'var(--theme-bg-tertiary)',
                color: 'var(--theme-text-primary)',
                ['--tw-ring-color' as string]: 'var(--theme-accent-gold)',
                ['--tw-ring-offset-color' as string]: 'var(--theme-surface-primary)',
              }}
              aria-label={searchPlaceholder}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm focus-visible:ring-2"
                style={{
                  color: 'var(--theme-text-muted)',
                  ['--tw-ring-color' as string]: 'var(--theme-accent-gold)',
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto" role="region" aria-label="Data table" tabIndex={0}>
        <table className="w-full text-sm" role="grid">
          <thead>
            <tr
              className="border-b"
              style={{ borderColor: 'var(--theme-border-secondary)' }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 font-medium tracking-wide text-xs uppercase whitespace-nowrap',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.hiddenOnMobile && 'hidden md:table-cell',
                    col.sortable && 'cursor-pointer select-none hover:opacity-80',
                    col.width
                  )}
                  style={{ color: 'var(--theme-text-muted)' }}
                  aria-sort={
                    currentSort.key === col.key && currentSort.direction
                      ? currentSort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  onClick={() => handleSort(col)}
                  onKeyDown={(e) => {
                    if (col.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(col);
                    }
                  }}
                  tabIndex={col.sortable ? 0 : undefined}
                  role={col.sortable ? 'columnheader button' : 'columnheader'}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span aria-hidden="true">
                        {currentSort.key === col.key && currentSort.direction === 'asc' ? (
                          <ChevronUp size={14} />
                        ) : currentSort.key === col.key && currentSort.direction === 'desc' ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {visibleData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                visibleData.map((row, idx) => (
                  <motion.tr
                    key={getRowKey(row, idx)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'border-b last:border-b-0 transition-colors',
                      onRowClick && 'cursor-pointer'
                    )}
                    style={{
                      borderColor: 'var(--theme-border-secondary)',
                    }}
                    onClick={() => onRowClick?.(row, idx)}
                    onKeyDown={(e) => {
                      if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onRowClick(row, idx);
                      }
                    }}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'row button' : 'row'}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right',
                          col.hiddenOnMobile && 'hidden md:table-cell',
                          col.width
                        )}
                        style={{ color: 'var(--theme-text-primary)' }}
                      >
                        {col.render(row, idx)}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Row count */}
      {sortedData.length > 0 && (
        <div
          className="px-4 py-2 text-xs border-t"
          style={{
            color: 'var(--theme-text-muted)',
            borderColor: 'var(--theme-border-secondary)',
          }}
        >
          {maxVisibleRows && sortedData.length > maxVisibleRows
            ? `Showing ${maxVisibleRows} of ${sortedData.length} rows`
            : `${sortedData.length} row${sortedData.length !== 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  );
}
