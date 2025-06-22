'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TradingWebSocketClient } from '@/lib/websocket/websocket-client';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface QuickTradeConfig {
  symbol: string;
  quantities: number[];
  defaultQuantity: number;
  maxSlippage: number;
  confirmBeforeExecution: boolean;
  enableHotkeys: boolean;
}

interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  spread: number;
  volume: number;
  change24h: number;
  change24hPercent: number;
}

interface QuickTradeButtonsProps {
  symbol: string;
  wsClient?: TradingWebSocketClient;
  config?: Partial<QuickTradeConfig>;
  availableBuyingPower?: number;
  currentPosition?: {
    quantity: number;
    side: 'long' | 'short';
    averagePrice: number;
  };
  onQuickTrade?: (params: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    orderType: 'market';
  }) => Promise<void>;
  onClosePosition?: (symbol: string) => Promise<void>;
  className?: string;
}

const DEFAULT_CONFIG: QuickTradeConfig = {
  symbol: 'BTCUSD',
  quantities: [0.01, 0.05, 0.1, 0.25, 0.5, 1.0],
  defaultQuantity: 0.1,
  maxSlippage: 0.5,
  confirmBeforeExecution: false,
  enableHotkeys: true,
};

export function QuickTradeButtons({
  symbol,
  wsClient,
  config = {},
  availableBuyingPower = 0,
  currentPosition,
  onQuickTrade,
  onClosePosition,
  className,
}: QuickTradeButtonsProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'QuickTradeButtons',
  });

  const finalConfig = { ...DEFAULT_CONFIG, ...config, symbol };
  
  const [marketData, setMarketData] = useState<MarketData>({
    symbol,
    bid: 0,
    ask: 0,
    last: 0,
    spread: 0,
    volume: 0,
    change24h: 0,
    change24hPercent: 0,
  });

  const [selectedQuantity, setSelectedQuantity] = useState(finalConfig.defaultQuantity);
  const [customQuantity, setCustomQuantity] = useState('');
  const [isExecuting, setIsExecuting] = useState<'buy' | 'sell' | 'close' | null>(null);
  const [lastTrade, setLastTrade] = useState<{
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    timestamp: Date;
  } | null>(null);

  // WebSocket integration for real-time market data
  useEffect(() => {
    if (!wsClient) return;

    const unsubscribe = wsClient.on('market_data', (message) => {
      const data = message.data;
      if (data.symbol === symbol) {
        setMarketData({
          symbol: data.symbol,
          bid: data.bid,
          ask: data.ask,
          last: data.last,
          spread: data.ask - data.bid,
          volume: data.volume,
          change24h: data.change24h,
          change24hPercent: data.change24hPercent,
        });
      }
    });

    // Subscribe to market data
    wsClient.send('subscribe_market_data', { symbol });

    return () => {
      unsubscribe();
      wsClient.send('unsubscribe_market_data', { symbol });
    };
  }, [wsClient, symbol]);

  // Performance monitoring
  useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Keyboard shortcuts
  useEffect(() => {
    if (!finalConfig.enableHotkeys) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if no input is focused and not in a modal
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handleQuickTrade('buy');
          break;
        case 's':
          e.preventDefault();
          handleQuickTrade('sell');
          break;
        case 'c':
          if (currentPosition) {
            e.preventDefault();
            handleClosePosition();
          }
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          e.preventDefault();
          const index = parseInt(e.key) - 1;
          if (index < finalConfig.quantities.length) {
            setSelectedQuantity(finalConfig.quantities[index]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [finalConfig.enableHotkeys, currentPosition]);

  // Calculate trade estimates
  const getTradeEstimate = (side: 'buy' | 'sell', quantity: number) => {
    const price = side === 'buy' ? marketData.ask : marketData.bid;
    const cost = quantity * price;
    const maxSlippageCost = cost * (finalConfig.maxSlippage / 100);
    const estimatedFees = cost * 0.001; // 0.1% fee estimate
    
    return {
      price,
      cost,
      maxSlippageCost,
      estimatedFees,
      totalCost: cost + estimatedFees + (side === 'buy' ? maxSlippageCost : 0),
    };
  };

  // Handle quick trade execution
  const handleQuickTrade = async (side: 'buy' | 'sell') => {
    const quantity = customQuantity ? parseFloat(customQuantity) : selectedQuantity;
    
    if (quantity <= 0) return;
    if (isExecuting) return;

    const estimate = getTradeEstimate(side, quantity);
    
    // Check buying power for buy orders
    if (side === 'buy' && estimate.totalCost > availableBuyingPower) {
      alert('Insufficient buying power');
      return;
    }

    // Confirmation dialog if enabled
    if (finalConfig.confirmBeforeExecution) {
      const confirmed = confirm(
        `${side.toUpperCase()} ${quantity} ${symbol} at ~$${estimate.price.toFixed(2)}?\n` +
        `Estimated cost: $${estimate.totalCost.toFixed(2)}`
      );
      if (!confirmed) return;
    }

    setIsExecuting(side);

    try {
      if (onQuickTrade) {
        await onQuickTrade({
          symbol,
          side,
          quantity,
          orderType: 'market',
        });

        // Record successful trade
        setLastTrade({
          side,
          quantity,
          price: estimate.price,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Quick trade failed:', error);
      alert('Trade execution failed');
    } finally {
      setIsExecuting(null);
    }
  };

  // Handle position closure
  const handleClosePosition = async () => {
    if (!currentPosition || isExecuting) return;

    if (finalConfig.confirmBeforeExecution) {
      const confirmed = confirm(
        `Close entire ${currentPosition.side} position of ${currentPosition.quantity} ${symbol}?`
      );
      if (!confirmed) return;
    }

    setIsExecuting('close');

    try {
      if (onClosePosition) {
        await onClosePosition(symbol);
      }
    } catch (error) {
      console.error('Position close failed:', error);
      alert('Position close failed');
    } finally {
      setIsExecuting(null);
    }
  };

  // Get the effective quantity (custom or selected)
  const effectiveQuantity = customQuantity ? parseFloat(customQuantity) : selectedQuantity;
  const buyEstimate = getTradeEstimate('buy', effectiveQuantity);
  const sellEstimate = getTradeEstimate('sell', effectiveQuantity);

  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Quick Trade</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{symbol}</Badge>
            {marketData.change24hPercent !== 0 && (
              <Badge 
                variant={marketData.change24hPercent >= 0 ? 'default' : 'destructive'}
                className={cn(
                  marketData.change24hPercent >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                )}
              >
                {marketData.change24hPercent >= 0 ? '+' : ''}{marketData.change24hPercent.toFixed(2)}%
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Market Data Display */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/20 rounded-lg text-center">
          <div>
            <div className="text-xs text-muted-foreground">Bid</div>
            <div className="font-mono text-sm text-green-600" style={{ color: theme.colors.bid }}>
              ${marketData.bid.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last</div>
            <div className="font-mono text-sm font-medium">
              ${marketData.last.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Ask</div>
            <div className="font-mono text-sm text-red-600" style={{ color: theme.colors.ask }}>
              ${marketData.ask.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Quantity Selection */}
        <div className="space-y-2">
          <Label className="text-sm">Quantity</Label>
          
          {/* Preset quantities */}
          <div className="grid grid-cols-3 gap-1">
            {finalConfig.quantities.map(qty => (
              <Button
                key={qty}
                variant={selectedQuantity === qty && !customQuantity ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedQuantity(qty);
                  setCustomQuantity('');
                }}
                className="text-xs"
              >
                {qty}
              </Button>
            ))}
          </div>

          {/* Custom quantity input */}
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.001"
              placeholder="Custom quantity"
              value={customQuantity}
              onChange={(e) => setCustomQuantity(e.target.value)}
              className="text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomQuantity('')}
              disabled={!customQuantity}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Current Position (if any) */}
        {currentPosition && (
          <div className="p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Position:</span>
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  currentPosition.side === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                )}>
                  {currentPosition.side}
                </Badge>
                <span className="font-mono">{currentPosition.quantity}</span>
                <span className="text-muted-foreground">@</span>
                <span className="font-mono">${currentPosition.averagePrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Trade Estimates */}
        {effectiveQuantity > 0 && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-green-50 rounded text-center">
              <div className="text-muted-foreground">Buy Cost</div>
              <div className="font-mono font-medium">${buyEstimate.totalCost.toFixed(2)}</div>
            </div>
            <div className="p-2 bg-red-50 rounded text-center">
              <div className="text-muted-foreground">Sell Value</div>
              <div className="font-mono font-medium">${sellEstimate.cost.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleQuickTrade('buy')}
            disabled={!effectiveQuantity || effectiveQuantity <= 0 || isExecuting !== null || 
                     buyEstimate.totalCost > availableBuyingPower}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {isExecuting === 'buy' ? 'Buying...' : `Buy ${effectiveQuantity || 0}`}
          </Button>
          
          <Button
            onClick={() => handleQuickTrade('sell')}
            disabled={!effectiveQuantity || effectiveQuantity <= 0 || isExecuting !== null}
            className="bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            {isExecuting === 'sell' ? 'Selling...' : `Sell ${effectiveQuantity || 0}`}
          </Button>
        </div>

        {/* Close Position Button */}
        {currentPosition && (
          <Button
            onClick={handleClosePosition}
            disabled={isExecuting !== null}
            variant="outline"
            size="lg"
            className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            {isExecuting === 'close' ? 'Closing...' : 'Close Position'}
          </Button>
        )}

        {/* Last Trade Info */}
        {lastTrade && (
          <div className="p-2 bg-muted/20 rounded-lg text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Trade:</span>
              <div className="flex items-center gap-1">
                <Badge variant={lastTrade.side === 'buy' ? 'default' : 'destructive'} className="text-xs">
                  {lastTrade.side}
                </Badge>
                <span className="font-mono">{lastTrade.quantity}</span>
                <span className="text-muted-foreground">@</span>
                <span className="font-mono">${lastTrade.price.toFixed(2)}</span>
                <span className="text-muted-foreground">
                  {lastTrade.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Hotkey Info */}
        {finalConfig.enableHotkeys && (
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <div>Hotkeys: B (Buy) • S (Sell) • C (Close) • 1-6 (Quantities)</div>
          </div>
        )}

        {/* Available Buying Power */}
        <div className="text-xs text-muted-foreground text-center">
          Available: ${availableBuyingPower.toFixed(2)}
        </div>
      </CardContent>
    </Card>
  );
}

// Configuration preset for different trading styles
export const QUICK_TRADE_PRESETS = {
  crypto: {
    quantities: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5],
    defaultQuantity: 0.01,
    maxSlippage: 1.0,
  },
  stocks: {
    quantities: [1, 5, 10, 25, 50, 100],
    defaultQuantity: 10,
    maxSlippage: 0.5,
  },
  forex: {
    quantities: [1000, 5000, 10000, 25000, 50000, 100000],
    defaultQuantity: 10000,
    maxSlippage: 0.1,
  },
  conservative: {
    quantities: [0.01, 0.02, 0.05, 0.1],
    defaultQuantity: 0.01,
    maxSlippage: 0.2,
    confirmBeforeExecution: true,
  },
  aggressive: {
    quantities: [0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
    defaultQuantity: 0.5,
    maxSlippage: 2.0,
    confirmBeforeExecution: false,
  },
};