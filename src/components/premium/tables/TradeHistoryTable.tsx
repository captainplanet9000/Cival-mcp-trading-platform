'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { LiveDataTable, createPriceColumn, createTimestampColumn } from './LiveDataTable';
import { TradingWebSocketClient } from '@/lib/websocket/websocket-client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePremiumTheme } from '../core/PremiumThemeProvider';

interface TradeHistoryEntry {
  id: string;
  timestamp: Date;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  value: number;
  fee: number;
  orderId: string;
  tradeId: string;
  strategy?: string;
  agentId?: string;
  executionType: 'market' | 'limit' | 'stop' | 'partial';
  status: 'executed' | 'settled' | 'failed';
  venue: string;
  liquidity: 'maker' | 'taker';
  slippage?: number;
  pnl?: number;
}

interface TradeHistoryTableProps {
  initialData?: TradeHistoryEntry[];
  wsClient?: TradingWebSocketClient;
  enableRealTimeUpdates?: boolean;
  enableFiltering?: boolean;
  symbolFilter?: string;
  strategyFilter?: string;
  agentFilter?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  onTradeClick?: (trade: TradeHistoryEntry) => void;
  onExport?: (trades: TradeHistoryEntry[]) => void;
  className?: string;
}

const EXECUTION_TYPE_COLORS = {
  market: 'bg-blue-100 text-blue-800',
  limit: 'bg-green-100 text-green-800',
  stop: 'bg-orange-100 text-orange-800',
  partial: 'bg-purple-100 text-purple-800',
};

const STATUS_COLORS = {
  executed: 'bg-green-100 text-green-800',
  settled: 'bg-gray-100 text-gray-800',
  failed: 'bg-red-100 text-red-800',
};

const LIQUIDITY_COLORS = {
  maker: 'bg-emerald-100 text-emerald-800',
  taker: 'bg-amber-100 text-amber-800',
};

export function TradeHistoryTable({
  initialData = [],
  wsClient,
  enableRealTimeUpdates = true,
  enableFiltering = true,
  symbolFilter,
  strategyFilter,
  agentFilter,
  timeRange,
  onTradeClick,
  onExport,
  className,
}: TradeHistoryTableProps) {
  const { theme } = usePremiumTheme();
  const [data, setData] = useState<TradeHistoryEntry[]>(initialData);
  const [filters, setFilters] = useState({
    symbol: symbolFilter || '',
    strategy: strategyFilter || '',
    agent: agentFilter || '',
    side: '' as 'buy' | 'sell' | '',
    executionType: '' as TradeHistoryEntry['executionType'] | '',
    venue: '',
  });

  // Filter data based on current filters and time range
  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply filters
    if (filters.symbol) {
      filtered = filtered.filter(trade => 
        trade.symbol.toLowerCase().includes(filters.symbol.toLowerCase())
      );
    }
    if (filters.strategy) {
      filtered = filtered.filter(trade => 
        trade.strategy?.toLowerCase().includes(filters.strategy.toLowerCase())
      );
    }
    if (filters.agent) {
      filtered = filtered.filter(trade => 
        trade.agentId?.toLowerCase().includes(filters.agent.toLowerCase())
      );
    }
    if (filters.side) {
      filtered = filtered.filter(trade => trade.side === filters.side);
    }
    if (filters.executionType) {
      filtered = filtered.filter(trade => trade.executionType === filters.executionType);
    }
    if (filters.venue) {
      filtered = filtered.filter(trade => 
        trade.venue.toLowerCase().includes(filters.venue.toLowerCase())
      );
    }

    // Apply time range filter
    if (timeRange) {
      filtered = filtered.filter(trade => 
        trade.timestamp >= timeRange.start && trade.timestamp <= timeRange.end
      );
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [data, filters, timeRange]);

  // Calculate summary statistics
  const statistics = useMemo(() => {
    const totalTrades = filteredData.length;
    const totalVolume = filteredData.reduce((sum, trade) => sum + trade.value, 0);
    const totalFees = filteredData.reduce((sum, trade) => sum + trade.fee, 0);
    const totalPnl = filteredData.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const buyTrades = filteredData.filter(trade => trade.side === 'buy').length;
    const sellTrades = filteredData.filter(trade => trade.side === 'sell').length;
    const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

    return {
      totalTrades,
      totalVolume,
      totalFees,
      totalPnl,
      buyTrades,
      sellTrades,
      avgTradeSize,
    };
  }, [filteredData]);

  // WebSocket integration for real-time trade updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !wsClient) return;

    const unsubscribe = wsClient.on('trade_executed', (message) => {
      const newTrade = message.data as TradeHistoryEntry;
      setData(prevData => [newTrade, ...prevData]);
    });

    return unsubscribe;
  }, [wsClient, enableRealTimeUpdates]);

  // Update data when initialData changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Define table columns
  const columns: ColumnDef<TradeHistoryEntry>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Time',
      cell: ({ getValue }) => {
        const timestamp = getValue() as Date;
        return (
          <div className="text-xs font-mono">
            <div>{timestamp.toLocaleDateString()}</div>
            <div className="text-muted-foreground">{timestamp.toLocaleTimeString()}</div>
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'symbol',
      header: 'Symbol',
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground">{getValue() as string}</span>
      ),
      size: 80,
    },
    {
      accessorKey: 'side',
      header: 'Side',
      cell: ({ getValue }) => {
        const side = getValue() as 'buy' | 'sell';
        return (
          <Badge
            variant={side === 'buy' ? 'default' : 'destructive'}
            className={cn(
              'capitalize',
              side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            )}
          >
            {side}
          </Badge>
        );
      },
      size: 60,
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ getValue }) => (
        <span className="font-mono text-right">{(getValue() as number).toFixed(4)}</span>
      ),
      size: 100,
    },
    createPriceColumn('price', 'Price'),
    {
      accessorKey: 'value',
      header: 'Value',
      cell: ({ getValue }) => (
        <span className="font-mono text-right">${(getValue() as number).toFixed(2)}</span>
      ),
      size: 100,
    },
    {
      accessorKey: 'fee',
      header: 'Fee',
      cell: ({ getValue }) => (
        <span className="font-mono text-right text-muted-foreground">
          ${(getValue() as number).toFixed(2)}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: 'executionType',
      header: 'Type',
      cell: ({ getValue }) => {
        const type = getValue() as TradeHistoryEntry['executionType'];
        return (
          <Badge className={cn('capitalize', EXECUTION_TYPE_COLORS[type])}>
            {type}
          </Badge>
        );
      },
      size: 80,
    },
    {
      accessorKey: 'liquidity',
      header: 'Liquidity',
      cell: ({ getValue }) => {
        const liquidity = getValue() as 'maker' | 'taker';
        return (
          <Badge className={cn('capitalize', LIQUIDITY_COLORS[liquidity])}>
            {liquidity}
          </Badge>
        );
      },
      size: 80,
    },
    {
      accessorKey: 'venue',
      header: 'Venue',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{getValue() as string}</span>
      ),
      size: 80,
    },
    {
      accessorKey: 'strategy',
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
      accessorKey: 'pnl',
      header: 'P&L',
      cell: ({ getValue }) => {
        const pnl = getValue() as number | undefined;
        if (pnl === undefined) return <span className="text-muted-foreground">--</span>;
        
        const isPositive = pnl >= 0;
        return (
          <span 
            className={cn(
              'font-mono text-right',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}
            style={{ color: isPositive ? theme.colors.profit : theme.colors.loss }}
          >
            {isPositive ? '+' : ''}${pnl.toFixed(2)}
          </span>
        );
      },
      size: 100,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTradeClick?.(row.original)}
            className="h-6 px-2 text-xs"
          >
            View
          </Button>
        </div>
      ),
      size: 80,
    },
  ];

  const handleExport = () => {
    if (onExport) {
      onExport(filteredData);
    } else {
      // Default CSV export
      const csvContent = [
        // Header
        'Timestamp,Symbol,Side,Quantity,Price,Value,Fee,Type,Liquidity,Venue,Strategy,P&L',
        // Data rows
        ...filteredData.map(trade => [
          trade.timestamp.toISOString(),
          trade.symbol,
          trade.side,
          trade.quantity,
          trade.price,
          trade.value,
          trade.fee,
          trade.executionType,
          trade.liquidity,
          trade.venue,
          trade.strategy || '',
          trade.pnl || '',
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trade-history-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{statistics.totalTrades}</div>
          <div className="text-xs text-muted-foreground">Total Trades</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">${statistics.totalVolume.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">Total Volume</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">${statistics.totalFees.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Total Fees</div>
        </div>
        <div className="text-center">
          <div 
            className={cn(
              'text-2xl font-bold',
              statistics.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
            )}
            style={{ 
              color: statistics.totalPnl >= 0 ? theme.colors.profit : theme.colors.loss 
            }}
          >
            {statistics.totalPnl >= 0 ? '+' : ''}${statistics.totalPnl.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">Total P&L</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{statistics.buyTrades}</div>
          <div className="text-xs text-muted-foreground">Buy Trades</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{statistics.sellTrades}</div>
          <div className="text-xs text-muted-foreground">Sell Trades</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">${statistics.avgTradeSize.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">Avg Size</div>
        </div>
      </div>

      {/* Filters */}
      {enableFiltering && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Filter by symbol..."
            value={filters.symbol}
            onChange={(e) => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
            className="w-40"
          />
          
          <Input
            placeholder="Filter by strategy..."
            value={filters.strategy}
            onChange={(e) => setFilters(prev => ({ ...prev, strategy: e.target.value }))}
            className="w-40"
          />

          <Select 
            value={filters.side} 
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              side: value as 'buy' | 'sell' | '' 
            }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Side" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sides</SelectItem>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.executionType} 
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              executionType: value as TradeHistoryEntry['executionType'] | '' 
            }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="limit">Limit</SelectItem>
              <SelectItem value="stop">Stop</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({
              symbol: '',
              strategy: '',
              agent: '',
              side: '',
              executionType: '',
              venue: '',
            })}
          >
            Clear Filters
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="ml-auto"
          >
            Export CSV
          </Button>
        </div>
      )}

      {/* Trade History Table */}
      <LiveDataTable
        data={filteredData}
        columns={columns}
        wsClient={wsClient}
        wsEventType="trade_executed"
        enableRealTimeUpdates={enableRealTimeUpdates}
        enableVirtualization={filteredData.length > 100}
        enableFiltering={false} // We handle filtering above
        enableSorting={true}
        enableColumnVisibility={true}
        updateKey="id"
        onRowClick={onTradeClick}
        title="Trade History"
        subtitle={`${filteredData.length} trades`}
        className={className}
      />
    </div>
  );
}

// Utility function to generate mock trade history data
export function generateMockTradeHistory(count: number = 50): TradeHistoryEntry[] {
  const symbols = ['BTCUSD', 'ETHUSD', 'AAPL', 'TSLA', 'GOOGL'];
  const strategies = ['momentum', 'mean_reversion', 'arbitrage', 'market_making'];
  const venues = ['Binance', 'Coinbase', 'NYSE', 'NASDAQ'];
  
  return Array.from({ length: count }, (_, i) => {
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const price = Math.random() * 1000 + 50;
    const quantity = Math.random() * 10 + 0.1;
    const value = price * quantity;
    
    return {
      id: `trade_${i}`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      side,
      quantity,
      price,
      value,
      fee: value * 0.001,
      orderId: `order_${i}`,
      tradeId: `trade_${i}`,
      strategy: Math.random() > 0.3 ? strategies[Math.floor(Math.random() * strategies.length)] : undefined,
      agentId: Math.random() > 0.5 ? `agent_${Math.floor(Math.random() * 5)}` : undefined,
      executionType: ['market', 'limit', 'stop', 'partial'][Math.floor(Math.random() * 4)] as any,
      status: 'executed' as const,
      venue: venues[Math.floor(Math.random() * venues.length)],
      liquidity: Math.random() > 0.5 ? 'maker' : 'taker',
      slippage: Math.random() * 0.001,
      pnl: (Math.random() - 0.5) * 100,
    };
  });
}