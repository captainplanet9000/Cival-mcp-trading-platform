'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TradingWebSocketClient } from '@/lib/websocket/websocket-client';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
  count?: number;
}

interface OrderBookData {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: Date;
  spread: number;
  spreadPercentage: number;
}

interface OrderBookTableProps {
  symbol: string;
  wsClient?: TradingWebSocketClient;
  enableRealTimeUpdates?: boolean;
  maxDepth?: number;
  priceDecimals?: number;
  quantityDecimals?: number;
  enableDepthChart?: boolean;
  enableSpreadIndicator?: boolean;
  onOrderClick?: (order: OrderBookEntry, side: 'bid' | 'ask') => void;
  className?: string;
}

export function OrderBookTable({
  symbol,
  wsClient,
  enableRealTimeUpdates = true,
  maxDepth = 20,
  priceDecimals = 2,
  quantityDecimals = 4,
  enableDepthChart = true,
  enableSpreadIndicator = true,
  onOrderClick,
  className,
}: OrderBookTableProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'OrderBookTable',
  });

  const [orderBookData, setOrderBookData] = useState<OrderBookData>({
    symbol,
    bids: [],
    asks: [],
    timestamp: new Date(),
    spread: 0,
    spreadPercentage: 0,
  });

  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // WebSocket integration for real-time order book updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !wsClient) return;

    const unsubscribe = wsClient.on('orderbook_update', (message) => {
      const data = message.data;
      if (data.symbol !== symbol) return;

      setOrderBookData(prevData => {
        const bids = data.bids?.slice(0, maxDepth) || prevData.bids;
        const asks = data.asks?.slice(0, maxDepth) || prevData.asks;
        
        // Calculate spread
        const bestBid = bids[0]?.price || 0;
        const bestAsk = asks[0]?.price || 0;
        const spread = bestAsk - bestBid;
        const spreadPercentage = bestBid > 0 ? (spread / bestBid) * 100 : 0;

        return {
          symbol,
          bids,
          asks,
          timestamp: new Date(data.timestamp),
          spread,
          spreadPercentage,
        };
      });
    });

    // Subscribe to connection status
    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    
    const unsubscribeConnect = wsClient.onConnect(onConnect);
    const unsubscribeDisconnect = wsClient.onDisconnect(onDisconnect);

    // Request initial order book data
    wsClient.send('subscribe_orderbook', { symbol, depth: maxDepth });

    return () => {
      unsubscribe();
      unsubscribeConnect();
      unsubscribeDisconnect();
      wsClient.send('unsubscribe_orderbook', { symbol });
    };
  }, [wsClient, enableRealTimeUpdates, symbol, maxDepth]);

  // Calculate depth chart data
  const depthChartData = useMemo(() => {
    if (!enableDepthChart) return null;

    const bidsWithCumulative = orderBookData.bids.map((bid, index) => ({
      ...bid,
      cumulative: orderBookData.bids.slice(0, index + 1).reduce((sum, b) => sum + b.quantity, 0),
    }));

    const asksWithCumulative = orderBookData.asks.map((ask, index) => ({
      ...ask,
      cumulative: orderBookData.asks.slice(0, index + 1).reduce((sum, a) => sum + a.quantity, 0),
    }));

    const maxCumulative = Math.max(
      bidsWithCumulative[bidsWithCumulative.length - 1]?.cumulative || 0,
      asksWithCumulative[asksWithCumulative.length - 1]?.cumulative || 0
    );

    return {
      bids: bidsWithCumulative,
      asks: asksWithCumulative,
      maxCumulative,
    };
  }, [orderBookData, enableDepthChart]);

  // Performance monitoring
  useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Render order book entry
  const renderOrderEntry = (
    entry: OrderBookEntry,
    side: 'bid' | 'ask',
    index: number,
    maxQuantity: number
  ) => {
    const isBid = side === 'bid';
    const fillPercentage = maxQuantity > 0 ? (entry.quantity / maxQuantity) * 100 : 0;
    const isHovered = hoveredPrice === entry.price;

    return (
      <div
        key={`${side}-${entry.price}-${index}`}
        className={cn(
          'relative flex items-center justify-between px-3 py-1 text-xs font-mono cursor-pointer transition-colors',
          'hover:bg-muted/20',
          isHovered && 'bg-muted/30'
        )}
        style={{
          backgroundColor: isHovered ? `${isBid ? theme.colors.bid : theme.colors.ask}10` : 'transparent',
        }}
        onMouseEnter={() => setHoveredPrice(entry.price)}
        onMouseLeave={() => setHoveredPrice(null)}
        onClick={() => onOrderClick?.(entry, side)}
      >
        {/* Depth visualization */}
        {enableDepthChart && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(to ${isBid ? 'left' : 'right'}, ${
                isBid ? theme.colors.bid : theme.colors.ask
              } 0%, transparent ${fillPercentage}%)`,
            }}
          />
        )}

        {/* Price */}
        <span
          className={cn(
            'font-medium',
            isBid ? 'text-green-600' : 'text-red-600'
          )}
          style={{ color: isBid ? theme.colors.bid : theme.colors.ask }}
        >
          {entry.price.toFixed(priceDecimals)}
        </span>

        {/* Quantity */}
        <span className="text-muted-foreground">
          {entry.quantity.toFixed(quantityDecimals)}
        </span>

        {/* Total */}
        <span className="text-muted-foreground text-right">
          {entry.total.toFixed(priceDecimals)}
        </span>
      </div>
    );
  };

  const maxBidQuantity = Math.max(...orderBookData.bids.map(b => b.quantity), 0);
  const maxAskQuantity = Math.max(...orderBookData.asks.map(a => a.quantity), 0);

  return (
    <div 
      className={cn('flex flex-col h-full', className)}
      style={{ backgroundColor: theme.colors.panelBackground }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Order Book</h3>
          <p className="text-xs text-muted-foreground">{symbol}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Connection status */}
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
            </div>
          )}
          
          {/* Last update time */}
          <span className="text-xs text-muted-foreground">
            {orderBookData.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
        <span>Price</span>
        <span className="text-center">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Order book content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Asks (sells) - reversed order */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col-reverse">
              {orderBookData.asks.map((ask, index) => 
                renderOrderEntry(ask, 'ask', index, maxAskQuantity)
              )}
            </div>
          </div>

          {/* Spread indicator */}
          {enableSpreadIndicator && orderBookData.bids.length > 0 && orderBookData.asks.length > 0 && (
            <div className="px-3 py-2 bg-muted/20 border-y border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Spread</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-foreground">
                    {orderBookData.spread.toFixed(priceDecimals)}
                  </span>
                  <span className="text-muted-foreground">
                    ({orderBookData.spreadPercentage.toFixed(3)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bids (buys) */}
          <div className="flex-1 overflow-y-auto">
            {orderBookData.bids.map((bid, index) => 
              renderOrderEntry(bid, 'bid', index, maxBidQuantity)
            )}
          </div>
        </div>
      </div>

      {/* Footer with market summary */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block">Best Bid</span>
            <span className="font-mono text-green-600" style={{ color: theme.colors.bid }}>
              {orderBookData.bids[0]?.price.toFixed(priceDecimals) || '--'}
            </span>
          </div>
          <div className="text-right">
            <span className="block">Best Ask</span>
            <span className="font-mono text-red-600" style={{ color: theme.colors.ask }}>
              {orderBookData.asks[0]?.price.toFixed(priceDecimals) || '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility function to generate mock order book data for development
export function generateMockOrderBookData(
  symbol: string,
  midPrice: number = 100,
  depth: number = 20
): OrderBookData {
  const spread = midPrice * 0.001; // 0.1% spread
  const bidPrice = midPrice - spread / 2;
  const askPrice = midPrice + spread / 2;

  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];

  for (let i = 0; i < depth; i++) {
    // Generate bid
    const bidPriceLevel = bidPrice - (i * 0.01);
    const bidQuantity = Math.random() * 10 + 1;
    bids.push({
      price: bidPriceLevel,
      quantity: bidQuantity,
      total: bidPriceLevel * bidQuantity,
      count: Math.floor(Math.random() * 5) + 1,
    });

    // Generate ask
    const askPriceLevel = askPrice + (i * 0.01);
    const askQuantity = Math.random() * 10 + 1;
    asks.push({
      price: askPriceLevel,
      quantity: askQuantity,
      total: askPriceLevel * askQuantity,
      count: Math.floor(Math.random() * 5) + 1,
    });
  }

  return {
    symbol,
    bids,
    asks,
    timestamp: new Date(),
    spread: askPrice - bidPrice,
    spreadPercentage: ((askPrice - bidPrice) / bidPrice) * 100,
  };
}