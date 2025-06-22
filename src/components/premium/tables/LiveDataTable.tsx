'use client';

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TradingWebSocketClient } from '@/lib/websocket/websocket-client';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface LiveDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  wsClient?: TradingWebSocketClient;
  wsEventType?: string;
  enableRealTimeUpdates?: boolean;
  enableVirtualization?: boolean;
  enableFiltering?: boolean;
  enableSorting?: boolean;
  enableColumnVisibility?: boolean;
  className?: string;
  maxRows?: number;
  rowHeight?: number;
  updateKey?: keyof T; // Key to identify unique rows for updates
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  renderRowActions?: (row: T) => React.ReactNode;
  title?: string;
  subtitle?: string;
  loading?: boolean;
}

export function LiveDataTable<T extends Record<string, any>>({
  data: initialData,
  columns,
  wsClient,
  wsEventType,
  enableRealTimeUpdates = true,
  enableVirtualization = false,
  enableFiltering = true,
  enableSorting = true,
  enableColumnVisibility = true,
  className,
  maxRows = 1000,
  rowHeight = 35,
  updateKey = 'id' as keyof T,
  onRowClick,
  onRowDoubleClick,
  renderRowActions,
  title,
  subtitle,
  loading = false,
}: LiveDataTableProps<T>) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'LiveDataTable',
  });

  const [data, setData] = useState<T[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // WebSocket integration for real-time updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !wsClient || !wsEventType) return;

    const unsubscribe = wsClient.on(wsEventType, (message) => {
      const newData = message.data;
      
      setData(prevData => {
        // Update existing row or add new row
        const existingIndex = prevData.findIndex(
          row => row[updateKey] === newData[updateKey]
        );

        let updatedData;
        if (existingIndex >= 0) {
          // Update existing row
          updatedData = [...prevData];
          updatedData[existingIndex] = { ...updatedData[existingIndex], ...newData };
        } else {
          // Add new row at the beginning
          updatedData = [newData, ...prevData];
        }

        // Limit to maxRows to prevent memory issues
        if (updatedData.length > maxRows) {
          updatedData = updatedData.slice(0, maxRows);
        }

        return updatedData;
      });

      setUpdateCount(prev => prev + 1);
      setLastUpdateTime(new Date());
    });

    return unsubscribe;
  }, [wsClient, wsEventType, enableRealTimeUpdates, updateKey, maxRows]);

  // Update data when initialData changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Enhanced columns with real-time indicators
  const enhancedColumns = useMemo(() => {
    if (!renderRowActions) return columns;

    return [
      ...columns,
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => renderRowActions(row.original),
        enableSorting: false,
        enableHiding: false,
      } as ColumnDef<T>,
    ];
  }, [columns, renderRowActions]);

  // Table configuration
  const table = useReactTable({
    data,
    columns: enhancedColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  // Virtual scrolling setup
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: enableVirtualization ? table.getRowModel().rows.length : 0,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  // Performance monitoring
  useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Row click handlers
  const handleRowClick = useCallback((row: T, event: React.MouseEvent) => {
    if (event.detail === 1) {
      onRowClick?.(row);
    } else if (event.detail === 2) {
      onRowDoubleClick?.(row);
    }
  }, [onRowClick, onRowDoubleClick]);

  // Connection status indicator
  const connectionStatus = wsClient?.isConnected ? 'connected' : 'disconnected';

  return (
    <div 
      className={cn('space-y-4', className)}
      style={{ backgroundColor: theme.colors.panelBackground }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {title && (
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Real-time status */}
          {enableRealTimeUpdates && (
            <div className="flex items-center gap-1 text-xs">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  connectionStatus === 'connected' 
                    ? 'bg-green-500 animate-pulse' 
                    : 'bg-red-500'
                )}
              />
              <span className="text-muted-foreground">
                {connectionStatus === 'connected' ? 'Live' : 'Offline'}
              </span>
              {lastUpdateTime && (
                <span className="text-muted-foreground">
                  • {updateCount} updates • {lastUpdateTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          )}

          {/* Column visibility */}
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter(column => column.getCanHide())
                  .map(column => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Global Filter */}
      {enableFiltering && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter data..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-sm"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGlobalFilter('')}
            >
              Clear
            </Button>
          )}
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} of {data.length} rows
          </div>
        </div>
      )}

      {/* Table Container */}
      <div
        ref={tableContainerRef}
        className={cn(
          'rounded-md border overflow-auto',
          enableVirtualization && 'max-h-[600px]'
        )}
        style={{ borderColor: theme.colors.panelBorder }}
      >
        <table className="w-full">
          {/* Header */}
          <thead 
            className="sticky top-0 z-10"
            style={{ backgroundColor: theme.colors.headerBackground }}
          >
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-3 py-2 text-left text-xs font-medium text-muted-foreground',
                      'border-b border-border',
                      header.column.getCanSort() && 'cursor-pointer select-none',
                      enableSorting && header.column.getCanSort() && 'hover:bg-muted/50'
                    )}
                    style={{ 
                      borderBottomColor: theme.colors.panelBorder,
                      width: header.getSize(),
                    }}
                    onClick={enableSorting ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      
                      {/* Sort indicator */}
                      {enableSorting && header.column.getCanSort() && (
                        <span className="text-xs opacity-60">
                          {{
                            asc: '↑',
                            desc: '↓',
                          }[header.column.getIsSorted() as string] ?? '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              <tr>
                <td 
                  colSpan={table.getVisibleFlatColumns().length}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : enableVirtualization ? (
              // Virtual scrolling rows
              <>
                {/* Spacer for virtual scrolling */}
                {rowVirtualizer.getVirtualItems().map(virtualItem => {
                  const row = table.getRowModel().rows[virtualItem.index];
                  return (
                    <tr
                      key={row.id}
                      data-index={virtualItem.index}
                      ref={node => rowVirtualizer.measureElement(node)}
                      className={cn(
                        'border-b border-border hover:bg-muted/50 transition-colors',
                        'cursor-pointer'
                      )}
                      style={{
                        transform: `translateY(${virtualItem.start}px)`,
                        borderBottomColor: theme.colors.panelBorder,
                      }}
                      onClick={(e) => handleRowClick(row.original, e)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className="px-3 py-2 text-sm"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </>
            ) : (
              // Regular rows
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border hover:bg-muted/50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  style={{ borderBottomColor: theme.colors.panelBorder }}
                  onClick={(e) => handleRowClick(row.original, e)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-3 py-2 text-sm"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
            
            {/* Empty state */}
            {!loading && table.getRowModel().rows.length === 0 && (
              <tr>
                <td 
                  colSpan={table.getVisibleFlatColumns().length}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with pagination info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Showing {table.getFilteredRowModel().rows.length} rows
          {maxRows && data.length >= maxRows && (
            <span className="text-yellow-500"> (limited to {maxRows})</span>
          )}
        </div>
        {enableRealTimeUpdates && (
          <div>
            Updates: {updateCount}
          </div>
        )}
      </div>
    </div>
  );
}

// Utility functions for common column definitions
export const createPriceColumn = (
  accessor: string,
  header: string = 'Price'
): ColumnDef<any> => ({
  accessorKey: accessor,
  header,
  cell: ({ getValue }) => {
    const value = getValue() as number;
    return (
      <span className="font-mono text-right">
        ${value?.toFixed(2) || '0.00'}
      </span>
    );
  },
});

export const createPercentageColumn = (
  accessor: string,
  header: string = 'Change %'
): ColumnDef<any> => ({
  accessorKey: accessor,
  header,
  cell: ({ getValue }) => {
    const value = getValue() as number;
    const isPositive = value >= 0;
    return (
      <span 
        className={cn(
          'font-mono text-right',
          isPositive ? 'text-green-600' : 'text-red-600'
        )}
      >
        {isPositive ? '+' : ''}{value?.toFixed(2) || '0.00'}%
      </span>
    );
  },
});

export const createStatusColumn = (
  accessor: string,
  header: string = 'Status'
): ColumnDef<any> => ({
  accessorKey: accessor,
  header,
  cell: ({ getValue }) => {
    const status = getValue() as string;
    const variant = status === 'active' || status === 'filled' ? 'default' : 
                   status === 'pending' ? 'secondary' : 'destructive';
    return (
      <Badge variant={variant} className="capitalize">
        {status}
      </Badge>
    );
  },
});

export const createTimestampColumn = (
  accessor: string,
  header: string = 'Time'
): ColumnDef<any> => ({
  accessorKey: accessor,
  header,
  cell: ({ getValue }) => {
    const timestamp = getValue() as Date | string;
    const date = new Date(timestamp);
    return (
      <span className="font-mono text-xs">
        {date.toLocaleTimeString()}
      </span>
    );
  },
});