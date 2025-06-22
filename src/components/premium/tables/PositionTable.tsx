'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { LiveDataTable, createPriceColumn, createPercentageColumn } from './LiveDataTable';
import { TradingWebSocketClient } from '@/lib/websocket/websocket-client';
import { Position } from '@/types/trading';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePremiumTheme } from '../core/PremiumThemeProvider';

interface PositionTableEntry extends Position {
  currentPrice: number;
  marketValue: number;
  dayChange: number;
  dayChangePercent: number;
  allocation: number; // Percentage of portfolio
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdate: Date;
}

interface PositionTableProps {
  initialData?: PositionTableEntry[];
  wsClient?: TradingWebSocketClient;
  enableRealTimeUpdates?: boolean;
  enablePositionActions?: boolean;
  onClosePosition?: (position: PositionTableEntry) => void;
  onModifyPosition?: (position: PositionTableEntry, action: 'stop_loss' | 'take_profit' | 'add' | 'reduce') => void;
  onViewDetails?: (position: PositionTableEntry) => void;
  className?: string;
}

const SIDE_COLORS = {
  long: 'bg-green-100 text-green-800',
  short: 'bg-red-100 text-red-800',
};

const RISK_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export function PositionTable({
  initialData = [],
  wsClient,
  enableRealTimeUpdates = true,
  enablePositionActions = true,
  onClosePosition,
  onModifyPosition,
  onViewDetails,
  className,
}: PositionTableProps) {
  const { theme } = usePremiumTheme();
  const [data, setData] = useState<PositionTableEntry[]>(initialData);

  // Calculate portfolio totals
  const portfolioStats = useMemo(() => {
    const totalMarketValue = data.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalUnrealizedPnl = data.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
    const totalRealizedPnl = data.reduce((sum, pos) => sum + pos.realized_pnl, 0);
    const totalDayChange = data.reduce((sum, pos) => sum + pos.dayChange, 0);
    const longPositions = data.filter(pos => pos.side === 'long').length;
    const shortPositions = data.filter(pos => pos.side === 'short').length;
    const highRiskPositions = data.filter(pos => pos.riskLevel === 'high').length;

    return {
      totalMarketValue,
      totalUnrealizedPnl,
      totalRealizedPnl,
      totalDayChange,
      totalDayChangePercent: totalMarketValue > 0 ? (totalDayChange / totalMarketValue) * 100 : 0,
      longPositions,
      shortPositions,
      totalPositions: data.length,
      highRiskPositions,
    };
  }, [data]);

  // WebSocket integration for real-time position updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !wsClient) return;

    const unsubscribe = wsClient.on('position_update', (message) => {
      const updatedPosition = message.data as PositionTableEntry;
      
      setData(prevData => {
        const existingIndex = prevData.findIndex(pos => pos.id === updatedPosition.id);
        
        if (existingIndex >= 0) {
          // Update existing position
          const updated = [...prevData];
          updated[existingIndex] = { ...updated[existingIndex], ...updatedPosition };
          return updated;
        } else {
          // Add new position
          return [...prevData, updatedPosition];
        }
      });
    });

    // Listen for position closures
    const unsubscribeClose = wsClient.on('position_closed', (message) => {
      const closedPositionId = message.data.positionId;
      setData(prevData => prevData.filter(pos => pos.id !== closedPositionId));
    });

    return () => {
      unsubscribe();
      unsubscribeClose();
    };
  }, [wsClient, enableRealTimeUpdates]);

  // Update data when initialData changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Position action handlers
  const handleClosePosition = (position: PositionTableEntry) => {
    if (onClosePosition) {
      onClosePosition(position);
    } else {
      // Default close action
      console.log('Closing position:', position.id);
    }
  };

  const handleModifyPosition = (position: PositionTableEntry, action: 'stop_loss' | 'take_profit' | 'add' | 'reduce') => {
    if (onModifyPosition) {
      onModifyPosition(position, action);
    } else {
      // Default modify action
      console.log('Modifying position:', position.id, action);
    }
  };

  // Define table columns
  const columns: ColumnDef<PositionTableEntry>[] = [
    {
      accessorKey: 'symbol',
      header: 'Symbol',
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{getValue() as string}</span>
          <Badge className={cn('text-xs', SIDE_COLORS[row.original.side])}>
            {row.original.side}
          </Badge>
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ getValue }) => (
        <span className="font-mono text-right">{(getValue() as number).toFixed(4)}</span>
      ),
      size: 100,
    },
    createPriceColumn('entry_price', 'Entry Price'),
    createPriceColumn('current_price', 'Current Price'),
    {
      accessorKey: 'marketValue',
      header: 'Market Value',
      cell: ({ getValue }) => (
        <span className="font-mono text-right">${(getValue() as number).toFixed(2)}</span>
      ),
      size: 120,
    },
    {
      accessorKey: 'unrealized_pnl',
      header: 'Unrealized P&L',
      cell: ({ getValue }) => {
        const pnl = getValue() as number;
        const isPositive = pnl >= 0;
        return (
          <span 
            className={cn('font-mono text-right', isPositive ? 'text-green-600' : 'text-red-600')}
            style={{ color: isPositive ? theme.colors.profit : theme.colors.loss }}
          >
            {isPositive ? '+' : ''}${pnl.toFixed(2)}
          </span>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'dayChange',
      header: 'Day Change',
      cell: ({ row }) => {
        const change = row.original.dayChange;
        const changePercent = row.original.dayChangePercent;
        const isPositive = change >= 0;
        return (
          <div className={cn('text-right', isPositive ? 'text-green-600' : 'text-red-600')}>
            <div className="font-mono">
              {isPositive ? '+' : ''}${change.toFixed(2)}
            </div>
            <div className="text-xs">
              ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
            </div>
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'allocation',
      header: 'Allocation',
      cell: ({ getValue }) => (
        <div className="text-right">
          <span className="font-mono">{(getValue() as number).toFixed(1)}%</span>
          <div className="w-full bg-muted rounded-full h-1 mt-1">
            <div 
              className="bg-primary h-1 rounded-full" 
              style={{ width: `${Math.min(getValue() as number, 100)}%` }}
            />
          </div>
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: 'riskLevel',
      header: 'Risk',
      cell: ({ getValue }) => {
        const risk = getValue() as 'low' | 'medium' | 'high';
        return (
          <Badge className={cn('capitalize', RISK_COLORS[risk])}>
            {risk}
          </Badge>
        );
      },
      size: 80,
    },
    {
      accessorKey: 'strategy_id',
      header: 'Strategy',
      cell: ({ getValue }) => {
        const strategy = getValue() as string | undefined;
        return strategy ? (
          <span className="text-xs text-muted-foreground">{strategy}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Manual</span>
        );
      },
      size: 100,
    },
    {
      accessorKey: 'entry_time',
      header: 'Entry Time',
      cell: ({ getValue }) => {
        const date = new Date(getValue() as Date);
        return (
          <div className="text-xs font-mono">
            <div>{date.toLocaleDateString()}</div>
            <div className="text-muted-foreground">{date.toLocaleTimeString()}</div>
          </div>
        );
      },
      size: 120,
    },
  ];

  // Add actions column if enabled
  if (enablePositionActions) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails?.(row.original)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleModifyPosition(row.original, 'stop_loss')}>
              Set Stop Loss
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleModifyPosition(row.original, 'take_profit')}>
              Set Take Profit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleModifyPosition(row.original, 'add')}>
              Add to Position
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleModifyPosition(row.original, 'reduce')}>
              Reduce Position
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleClosePosition(row.original)}
              className="text-destructive"
            >
              Close Position
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 100,
    });
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{portfolioStats.totalPositions}</div>
          <div className="text-xs text-muted-foreground">Total Positions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">${portfolioStats.totalMarketValue.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">Market Value</div>
        </div>
        <div className="text-center">
          <div 
            className={cn(
              'text-2xl font-bold',
              portfolioStats.totalUnrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
            )}
            style={{ 
              color: portfolioStats.totalUnrealizedPnl >= 0 ? theme.colors.profit : theme.colors.loss 
            }}
          >
            {portfolioStats.totalUnrealizedPnl >= 0 ? '+' : ''}${portfolioStats.totalUnrealizedPnl.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">Unrealized P&L</div>
        </div>
        <div className="text-center">
          <div 
            className={cn(
              'text-2xl font-bold',
              portfolioStats.totalDayChange >= 0 ? 'text-green-600' : 'text-red-600'
            )}
            style={{ 
              color: portfolioStats.totalDayChange >= 0 ? theme.colors.profit : theme.colors.loss 
            }}
          >
            {portfolioStats.totalDayChange >= 0 ? '+' : ''}${portfolioStats.totalDayChange.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">Day Change</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{portfolioStats.longPositions}</div>
          <div className="text-xs text-muted-foreground">Long Positions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{portfolioStats.shortPositions}</div>
          <div className="text-xs text-muted-foreground">Short Positions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">${portfolioStats.totalRealizedPnl.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Realized P&L</div>
        </div>
        <div className="text-center">
          <div className={cn(
            'text-2xl font-bold',
            portfolioStats.highRiskPositions > 0 ? 'text-red-600' : 'text-green-600'
          )}>
            {portfolioStats.highRiskPositions}
          </div>
          <div className="text-xs text-muted-foreground">High Risk</div>
        </div>
      </div>

      {/* Positions Table */}
      <LiveDataTable
        data={data}
        columns={columns}
        wsClient={wsClient}
        wsEventType="position_update"
        enableRealTimeUpdates={enableRealTimeUpdates}
        enableVirtualization={false}
        enableFiltering={true}
        enableSorting={true}
        enableColumnVisibility={true}
        updateKey="id"
        onRowClick={onViewDetails}
        title="Positions"
        subtitle={`${data.length} active positions`}
        className={className}
      />
    </div>
  );
}

// Utility function to generate mock position data
export function generateMockPositions(count: number = 10): PositionTableEntry[] {
  const symbols = ['BTCUSD', 'ETHUSD', 'AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA'];
  const strategies = ['momentum', 'mean_reversion', 'arbitrage', 'market_making'];
  
  return Array.from({ length: count }, (_, i) => {
    const side = Math.random() > 0.5 ? 'long' : 'short';
    const entryPrice = Math.random() * 1000 + 50;
    const currentPrice = entryPrice * (0.95 + Math.random() * 0.1); // ±5% from entry
    const quantity = Math.random() * 10 + 0.1;
    const marketValue = currentPrice * quantity;
    const unrealizedPnl = (currentPrice - entryPrice) * quantity * (side === 'long' ? 1 : -1);
    const dayChange = (Math.random() - 0.5) * marketValue * 0.1;
    
    return {
      id: `pos_${i}`,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      side,
      quantity,
      entry_price: entryPrice,
      current_price: currentPrice,
      unrealized_pnl: unrealizedPnl,
      realized_pnl: (Math.random() - 0.5) * 100,
      entry_time: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      strategy_id: Math.random() > 0.3 ? strategies[Math.floor(Math.random() * strategies.length)] : undefined,
      stop_loss: Math.random() > 0.5 ? entryPrice * 0.95 : undefined,
      take_profit: Math.random() > 0.5 ? entryPrice * 1.1 : undefined,
      commission: marketValue * 0.001,
      currentPrice,
      marketValue,
      dayChange,
      dayChangePercent: marketValue > 0 ? (dayChange / marketValue) * 100 : 0,
      allocation: Math.random() * 20 + 1,
      riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
      lastUpdate: new Date(),
    };
  });
}