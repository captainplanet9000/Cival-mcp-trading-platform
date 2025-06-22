'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TradingWebSocketClient } from '@/lib/websocket/websocket-client';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
  cumulative: number;
}

interface MarketDepthData {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: Date;
  spread: number;
  midPrice: number;
}

interface MarketDepthChartProps {
  symbol: string;
  wsClient?: TradingWebSocketClient;
  enableRealTimeUpdates?: boolean;
  maxDepth?: number;
  chartType?: 'area' | 'bar' | 'stepped';
  showSpread?: boolean;
  showMidPrice?: boolean;
  showCumulativeVolume?: boolean;
  height?: number;
  className?: string;
}

export function MarketDepthChart({
  symbol,
  wsClient,
  enableRealTimeUpdates = true,
  maxDepth = 50,
  chartType = 'area',
  showSpread = true,
  showMidPrice = true,
  showCumulativeVolume = true,
  height = 400,
  className,
}: MarketDepthChartProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'MarketDepthChart',
  });

  const [depthData, setDepthData] = useState<MarketDepthData>({
    symbol,
    bids: [],
    asks: [],
    timestamp: new Date(),
    spread: 0,
    midPrice: 0,
  });

  const [viewMode, setViewMode] = useState<'depth' | 'volume' | 'both'>('depth');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // WebSocket integration for real-time order book updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !wsClient) return;

    const unsubscribe = wsClient.on('orderbook_update', (message) => {
      const data = message.data;
      if (data.symbol !== symbol) return;

      const bids = (data.bids || []).slice(0, maxDepth);
      const asks = (data.asks || []).slice(0, maxDepth);

      // Calculate cumulative volumes
      let cumulativeBidVolume = 0;
      const processedBids = bids.map((bid: any) => {
        cumulativeBidVolume += bid.quantity;
        return {
          price: bid.price,
          quantity: bid.quantity,
          total: bid.price * bid.quantity,
          cumulative: cumulativeBidVolume,
        };
      });

      let cumulativeAskVolume = 0;
      const processedAsks = asks.map((ask: any) => {
        cumulativeAskVolume += ask.quantity;
        return {
          price: ask.price,
          quantity: ask.quantity,
          total: ask.price * ask.quantity,
          cumulative: cumulativeAskVolume,
        };
      });

      const bestBid = processedBids[0]?.price || 0;
      const bestAsk = processedAsks[0]?.price || 0;
      const spread = bestAsk - bestBid;
      const midPrice = (bestBid + bestAsk) / 2;

      setDepthData({
        symbol,
        bids: processedBids,
        asks: processedAsks,
        timestamp: new Date(data.timestamp),
        spread,
        midPrice,
      });

      // Update price range for better visualization
      if (processedBids.length > 0 && processedAsks.length > 0) {
        const minPrice = Math.min(processedBids[processedBids.length - 1].price, bestBid * 0.99);
        const maxPrice = Math.max(processedAsks[processedAsks.length - 1].price, bestAsk * 1.01);
        setPriceRange({ min: minPrice, max: maxPrice });
      }
    });

    // Connection status handlers
    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    
    const unsubscribeConnect = wsClient.onConnect(onConnect);
    const unsubscribeDisconnect = wsClient.onDisconnect(onDisconnect);

    // Subscribe to order book updates
    wsClient.send('subscribe_orderbook', { symbol, depth: maxDepth });

    return () => {
      unsubscribe();
      unsubscribeConnect();
      unsubscribeDisconnect();
      wsClient.send('unsubscribe_orderbook', { symbol });
    };
  }, [wsClient, enableRealTimeUpdates, symbol, maxDepth]);

  // Performance monitoring
  useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (depthData.bids.length === 0 && depthData.asks.length === 0) {
      return null;
    }

    const datasets: any[] = [];

    if (viewMode === 'depth' || viewMode === 'both') {
      // Bid depth area
      if (depthData.bids.length > 0) {
        const bidData = depthData.bids.map(bid => ({
          x: bid.price,
          y: showCumulativeVolume ? bid.cumulative : bid.quantity,
        })).reverse(); // Reverse to show highest price first

        datasets.push({
          label: 'Bids',
          data: bidData,
          borderColor: theme.colors.bid,
          backgroundColor: chartType === 'area' ? `${theme.colors.bid}40` : theme.colors.bid,
          fill: chartType === 'area',
          stepped: chartType === 'stepped',
          tension: 0,
          pointRadius: 0,
          borderWidth: 2,
        });
      }

      // Ask depth area
      if (depthData.asks.length > 0) {
        const askData = depthData.asks.map(ask => ({
          x: ask.price,
          y: showCumulativeVolume ? ask.cumulative : ask.quantity,
        }));

        datasets.push({
          label: 'Asks',
          data: askData,
          borderColor: theme.colors.ask,
          backgroundColor: chartType === 'area' ? `${theme.colors.ask}40` : theme.colors.ask,
          fill: chartType === 'area',
          stepped: chartType === 'stepped',
          tension: 0,
          pointRadius: 0,
          borderWidth: 2,
        });
      }
    }

    if (viewMode === 'volume' || viewMode === 'both') {
      // Volume bars for bids
      if (depthData.bids.length > 0) {
        datasets.push({
          label: 'Bid Volume',
          data: depthData.bids.map(bid => ({
            x: bid.price,
            y: bid.quantity,
          })),
          type: 'bar' as const,
          backgroundColor: `${theme.colors.bid}60`,
          borderColor: theme.colors.bid,
          borderWidth: 1,
          yAxisID: 'volume',
        });
      }

      // Volume bars for asks
      if (depthData.asks.length > 0) {
        datasets.push({
          label: 'Ask Volume',
          data: depthData.asks.map(ask => ({
            x: ask.price,
            y: ask.quantity,
          })),
          type: 'bar' as const,
          backgroundColor: `${theme.colors.ask}60`,
          borderColor: theme.colors.ask,
          borderWidth: 1,
          yAxisID: 'volume',
        });
      }
    }

    // Mid price line
    if (showMidPrice && depthData.midPrice > 0) {
      datasets.push({
        label: 'Mid Price',
        data: [
          { x: priceRange?.min || depthData.midPrice * 0.99, y: 0 },
          { x: priceRange?.max || depthData.midPrice * 1.01, y: 0 },
        ],
        borderColor: theme.colors.foreground,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0,
        fill: false,
      });
    }

    return { datasets };
  }, [depthData, viewMode, showCumulativeVolume, showMidPrice, chartType, theme, priceRange]);

  // Chart options
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: theme.colors.foreground,
          filter: (legendItem: any) => legendItem.text !== 'Mid Price' || showMidPrice,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: theme.colors.popover,
        titleColor: theme.colors.popoverForeground,
        bodyColor: theme.colors.popoverForeground,
        borderColor: theme.colors.border,
        borderWidth: 1,
        callbacks: {
          title: (context: any) => {
            return `Price: $${Number(context[0].parsed.x).toFixed(2)}`;
          },
          label: (context: any) => {
            const label = context.dataset.label;
            const value = Number(context.parsed.y);
            
            if (label.includes('Volume')) {
              return `${label}: ${value.toFixed(4)}`;
            } else if (label === 'Bids' || label === 'Asks') {
              return `${label}: ${value.toFixed(4)} ${showCumulativeVolume ? '(Cumulative)' : ''}`;
            }
            return `${label}: ${value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: {
          display: true,
          text: 'Price ($)',
          color: theme.colors.foreground,
        },
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
          callback: function(value: any) {
            return `$${Number(value).toFixed(2)}`;
          },
        },
        min: priceRange?.min,
        max: priceRange?.max,
      },
      y: {
        type: 'linear' as const,
        display: viewMode !== 'volume',
        position: 'left' as const,
        title: {
          display: true,
          text: showCumulativeVolume ? 'Cumulative Volume' : 'Volume',
          color: theme.colors.foreground,
        },
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
          callback: function(value: any) {
            return Number(value).toFixed(2);
          },
        },
        beginAtZero: true,
      },
      volume: {
        type: 'linear' as const,
        display: viewMode === 'volume' || viewMode === 'both',
        position: 'right' as const,
        title: {
          display: true,
          text: 'Order Volume',
          color: theme.colors.foreground,
        },
        grid: {
          display: false,
        },
        ticks: {
          color: theme.colors.mutedForeground,
          callback: function(value: any) {
            return Number(value).toFixed(2);
          },
        },
        beginAtZero: true,
      },
    },
  }), [theme, viewMode, showCumulativeVolume, showMidPrice, priceRange]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalBidVolume = depthData.bids.reduce((sum, bid) => sum + bid.quantity, 0);
    const totalAskVolume = depthData.asks.reduce((sum, ask) => sum + ask.quantity, 0);
    const totalBidValue = depthData.bids.reduce((sum, bid) => sum + bid.total, 0);
    const totalAskValue = depthData.asks.reduce((sum, ask) => sum + ask.total, 0);
    const imbalance = totalBidVolume && totalAskVolume 
      ? ((totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume)) * 100 
      : 0;

    return {
      totalBidVolume,
      totalAskVolume,
      totalBidValue,
      totalAskValue,
      imbalance,
      spreadBps: depthData.midPrice > 0 ? (depthData.spread / depthData.midPrice) * 10000 : 0,
    };
  }, [depthData]);

  if (!chartData) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-muted border-t-foreground rounded-full animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading market depth...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>Market Depth</span>
            <Badge variant="outline">{symbol}</Badge>
            {enableRealTimeUpdates && (
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    connectionStatus === 'connected' 
                      ? 'bg-green-500 animate-pulse' 
                      : 'bg-red-500'
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {connectionStatus === 'connected' ? 'Live' : 'Offline'}
                </span>
              </div>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* View mode selector */}
            <div className="flex items-center gap-1">
              {(['depth', 'volume', 'both'] as const).map(mode => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="h-6 px-2 text-xs capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>

            {/* Options */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Switch
                  id="cumulative"
                  checked={showCumulativeVolume}
                  onCheckedChange={setShowCumulativeVolume}
                  size="sm"
                />
                <Label htmlFor="cumulative" className="text-xs">Cumulative</Label>
              </div>

              <div className="flex items-center gap-1">
                <Switch
                  id="midprice"
                  checked={showMidPrice}
                  onCheckedChange={setShowMidPrice}
                  size="sm"
                />
                <Label htmlFor="midprice" className="text-xs">Mid Price</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Market Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
          <div className="text-center">
            <div className="text-sm font-medium text-green-600" style={{ color: theme.colors.bid }}>
              ${depthData.bids[0]?.price.toFixed(2) || '--'}
            </div>
            <div className="text-xs text-muted-foreground">Best Bid</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-red-600" style={{ color: theme.colors.ask }}>
              ${depthData.asks[0]?.price.toFixed(2) || '--'}
            </div>
            <div className="text-xs text-muted-foreground">Best Ask</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">${depthData.spread.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Spread</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">{statistics.spreadBps.toFixed(1)} bps</div>
            <div className="text-xs text-muted-foreground">Spread (bps)</div>
          </div>
          <div className="text-center">
            <div className={cn(
              'text-sm font-medium',
              statistics.imbalance > 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {statistics.imbalance > 0 ? '+' : ''}{statistics.imbalance.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Imbalance</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">{depthData.timestamp.toLocaleTimeString()}</div>
            <div className="text-xs text-muted-foreground">Last Update</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ height: `${height}px` }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </CardContent>
    </Card>
  );
}