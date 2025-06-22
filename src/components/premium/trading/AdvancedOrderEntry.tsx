'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { TradingWebSocketClient } from '@/lib/websocket/websocket-client';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface OrderFormData {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit' | 'bracket' | 'oco' | 'trailing_stop';
  quantity: string;
  price: string;
  stopPrice: string;
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  
  // Advanced options
  reduceOnly: boolean;
  postOnly: boolean;
  iceberg: boolean;
  icebergQuantity: string;
  
  // Bracket order specific
  takeProfitPrice: string;
  stopLossPrice: string;
  
  // Trailing stop specific
  trailAmount: string;
  trailPercent: string;
  
  // Strategy assignment
  strategyId?: string;
  agentId?: string;
  
  // Risk management
  maxSlippage: string;
  positionSizing: 'fixed' | 'percentage' | 'risk_based';
  positionSize: string;
  riskAmount: string;
}

interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  change24h: number;
  change24hPercent: number;
}

interface AdvancedOrderEntryProps {
  initialSymbol?: string;
  wsClient?: TradingWebSocketClient;
  availableSymbols?: string[];
  availableStrategies?: Array<{ id: string; name: string }>;
  availableAgents?: Array<{ id: string; name: string }>;
  portfolioValue?: number;
  availableBuyingPower?: number;
  onOrderSubmit?: (orderData: OrderFormData) => Promise<void>;
  onOrderValidate?: (orderData: OrderFormData) => Promise<string[]>;
  className?: string;
}

const ORDER_TYPES = [
  { value: 'market', label: 'Market', description: 'Execute immediately at current market price' },
  { value: 'limit', label: 'Limit', description: 'Execute only at specified price or better' },
  { value: 'stop', label: 'Stop', description: 'Market order triggered when stop price is reached' },
  { value: 'stop_limit', label: 'Stop Limit', description: 'Limit order triggered when stop price is reached' },
  { value: 'bracket', label: 'Bracket', description: 'Entry with automatic take profit and stop loss' },
  { value: 'oco', label: 'OCO', description: 'One-cancels-other order pair' },
  { value: 'trailing_stop', label: 'Trailing Stop', description: 'Stop that trails price by specified amount' },
];

const TIME_IN_FORCE_OPTIONS = [
  { value: 'day', label: 'Day', description: 'Valid until end of trading day' },
  { value: 'gtc', label: 'GTC', description: 'Good till cancelled' },
  { value: 'ioc', label: 'IOC', description: 'Immediate or cancel' },
  { value: 'fok', label: 'FOK', description: 'Fill or kill' },
];

export function AdvancedOrderEntry({
  initialSymbol = 'BTCUSD',
  wsClient,
  availableSymbols = ['BTCUSD', 'ETHUSD', 'AAPL', 'TSLA', 'GOOGL'],
  availableStrategies = [],
  availableAgents = [],
  portfolioValue = 100000,
  availableBuyingPower = 50000,
  onOrderSubmit,
  onOrderValidate,
  className,
}: AdvancedOrderEntryProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'AdvancedOrderEntry',
  });

  const [formData, setFormData] = useState<OrderFormData>({
    symbol: initialSymbol,
    side: 'buy',
    orderType: 'market',
    quantity: '',
    price: '',
    stopPrice: '',
    timeInForce: 'gtc',
    reduceOnly: false,
    postOnly: false,
    iceberg: false,
    icebergQuantity: '',
    takeProfitPrice: '',
    stopLossPrice: '',
    trailAmount: '',
    trailPercent: '',
    maxSlippage: '0.5',
    positionSizing: 'fixed',
    positionSize: '',
    riskAmount: '1000',
  });

  const [marketData, setMarketData] = useState<MarketData>({
    symbol: initialSymbol,
    bid: 0,
    ask: 0,
    last: 0,
    volume: 0,
    change24h: 0,
    change24hPercent: 0,
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderEstimate, setOrderEstimate] = useState<{
    estimatedCost: number;
    estimatedFees: number;
    estimatedSlippage: number;
    marginRequired: number;
  } | null>(null);

  // WebSocket integration for real-time market data
  useEffect(() => {
    if (!wsClient) return;

    const unsubscribe = wsClient.on('market_data', (message) => {
      const data = message.data;
      if (data.symbol === formData.symbol) {
        setMarketData(data);
      }
    });

    // Subscribe to market data for current symbol
    wsClient.send('subscribe_market_data', { symbol: formData.symbol });

    return () => {
      unsubscribe();
      wsClient.send('unsubscribe_market_data', { symbol: formData.symbol });
    };
  }, [wsClient, formData.symbol]);

  // Performance monitoring
  useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Calculate order estimate
  useEffect(() => {
    if (!formData.quantity || !marketData.last) return;

    const quantity = parseFloat(formData.quantity);
    const price = formData.orderType === 'market' 
      ? (formData.side === 'buy' ? marketData.ask : marketData.bid)
      : parseFloat(formData.price);

    if (!price || quantity <= 0) return;

    const estimatedCost = quantity * price;
    const estimatedFees = estimatedCost * 0.001; // 0.1% fee estimate
    const estimatedSlippage = formData.orderType === 'market' ? estimatedCost * 0.001 : 0;
    const marginRequired = formData.side === 'buy' ? estimatedCost + estimatedFees : 0;

    setOrderEstimate({
      estimatedCost,
      estimatedFees,
      estimatedSlippage,
      marginRequired,
    });
  }, [formData.quantity, formData.price, formData.side, formData.orderType, marketData]);

  // Handle form field changes
  const updateFormData = (field: keyof OrderFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]); // Clear validation errors on change
  };

  // Handle symbol change
  const handleSymbolChange = (symbol: string) => {
    updateFormData('symbol', symbol);
    // Reset price fields when symbol changes
    setFormData(prev => ({
      ...prev,
      symbol,
      price: '',
      stopPrice: '',
      takeProfitPrice: '',
      stopLossPrice: '',
    }));
  };

  // Handle order type change
  const handleOrderTypeChange = (orderType: OrderFormData['orderType']) => {
    updateFormData('orderType', orderType);
    
    // Reset fields that don't apply to new order type
    if (orderType === 'market') {
      updateFormData('price', '');
      updateFormData('postOnly', false);
    }
  };

  // Auto-fill price for limit orders
  const autoFillPrice = (side: 'buy' | 'sell') => {
    const price = side === 'buy' ? marketData.bid : marketData.ask;
    updateFormData('price', price.toString());
  };

  // Calculate position size based on risk
  const calculatePositionSize = () => {
    if (formData.positionSizing === 'risk_based' && formData.riskAmount && formData.stopLossPrice) {
      const riskAmount = parseFloat(formData.riskAmount);
      const entryPrice = parseFloat(formData.price) || marketData.last;
      const stopLoss = parseFloat(formData.stopLossPrice);
      
      if (entryPrice && stopLoss && riskAmount > 0) {
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        const quantity = riskAmount / riskPerShare;
        updateFormData('quantity', quantity.toFixed(4));
      }
    } else if (formData.positionSizing === 'percentage' && formData.positionSize) {
      const percentage = parseFloat(formData.positionSize) / 100;
      const availableCapital = availableBuyingPower * percentage;
      const price = parseFloat(formData.price) || marketData.last;
      
      if (price > 0) {
        const quantity = availableCapital / price;
        updateFormData('quantity', quantity.toFixed(4));
      }
    }
  };

  // Validate order
  const validateOrder = async (): Promise<boolean> => {
    const errors: string[] = [];

    // Basic validation
    if (!formData.symbol) errors.push('Symbol is required');
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) errors.push('Valid quantity is required');
    
    // Price validation for non-market orders
    if (formData.orderType !== 'market' && (!formData.price || parseFloat(formData.price) <= 0)) {
      errors.push('Valid price is required for non-market orders');
    }

    // Stop price validation
    if (['stop', 'stop_limit', 'trailing_stop'].includes(formData.orderType) && 
        (!formData.stopPrice || parseFloat(formData.stopPrice) <= 0)) {
      errors.push('Valid stop price is required');
    }

    // Bracket order validation
    if (formData.orderType === 'bracket') {
      if (!formData.takeProfitPrice || parseFloat(formData.takeProfitPrice) <= 0) {
        errors.push('Take profit price is required for bracket orders');
      }
      if (!formData.stopLossPrice || parseFloat(formData.stopLossPrice) <= 0) {
        errors.push('Stop loss price is required for bracket orders');
      }
    }

    // Buying power validation
    if (orderEstimate && orderEstimate.marginRequired > availableBuyingPower) {
      errors.push('Insufficient buying power');
    }

    // Custom validation
    if (onOrderValidate) {
      const customErrors = await onOrderValidate(formData);
      errors.push(...customErrors);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Submit order
  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const isValid = await validateOrder();
      if (!isValid) return;

      if (onOrderSubmit) {
        await onOrderSubmit(formData);
        // Reset form on successful submission
        setFormData(prev => ({
          ...prev,
          quantity: '',
          price: '',
          stopPrice: '',
          takeProfitPrice: '',
          stopLossPrice: '',
        }));
      }
    } catch (error) {
      console.error('Order submission failed:', error);
      setValidationErrors(['Order submission failed']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if order type requires additional fields
  const requiresPrice = !['market', 'trailing_stop'].includes(formData.orderType);
  const requiresStopPrice = ['stop', 'stop_limit', 'trailing_stop'].includes(formData.orderType);
  const isBracketOrder = formData.orderType === 'bracket';
  const isTrailingStop = formData.orderType === 'trailing_stop';

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Advanced Order Entry</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{formData.symbol}</Badge>
            {marketData.last > 0 && (
              <Badge variant="secondary">${marketData.last.toFixed(2)}</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="risk">Risk Management</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            {/* Symbol and Side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Select value={formData.symbol} onValueChange={handleSymbolChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSymbols.map(symbol => (
                      <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="side">Side</Label>
                <Select value={formData.side} onValueChange={(value) => updateFormData('side', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Order Type */}
            <div>
              <Label htmlFor="orderType">Order Type</Label>
              <Select value={formData.orderType} onValueChange={handleOrderTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                value={formData.quantity}
                onChange={(e) => updateFormData('quantity', e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            {/* Price (for non-market orders) */}
            {requiresPrice && (
              <div>
                <Label htmlFor="price">Price</Label>
                <div className="flex gap-2">
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => updateFormData('price', e.target.value)}
                    placeholder="Enter price"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => autoFillPrice(formData.side)}
                  >
                    Use {formData.side === 'buy' ? 'Bid' : 'Ask'}
                  </Button>
                </div>
              </div>
            )}

            {/* Stop Price */}
            {requiresStopPrice && (
              <div>
                <Label htmlFor="stopPrice">Stop Price</Label>
                <Input
                  id="stopPrice"
                  type="number"
                  step="0.01"
                  value={formData.stopPrice}
                  onChange={(e) => updateFormData('stopPrice', e.target.value)}
                  placeholder="Enter stop price"
                />
              </div>
            )}

            {/* Bracket Order Fields */}
            {isBracketOrder && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="takeProfitPrice">Take Profit Price</Label>
                  <Input
                    id="takeProfitPrice"
                    type="number"
                    step="0.01"
                    value={formData.takeProfitPrice}
                    onChange={(e) => updateFormData('takeProfitPrice', e.target.value)}
                    placeholder="Enter take profit"
                  />
                </div>
                <div>
                  <Label htmlFor="stopLossPrice">Stop Loss Price</Label>
                  <Input
                    id="stopLossPrice"
                    type="number"
                    step="0.01"
                    value={formData.stopLossPrice}
                    onChange={(e) => updateFormData('stopLossPrice', e.target.value)}
                    placeholder="Enter stop loss"
                  />
                </div>
              </div>
            )}

            {/* Trailing Stop Fields */}
            {isTrailingStop && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trailAmount">Trail Amount ($)</Label>
                  <Input
                    id="trailAmount"
                    type="number"
                    step="0.01"
                    value={formData.trailAmount}
                    onChange={(e) => updateFormData('trailAmount', e.target.value)}
                    placeholder="Enter trail amount"
                  />
                </div>
                <div>
                  <Label htmlFor="trailPercent">Trail Percent (%)</Label>
                  <Input
                    id="trailPercent"
                    type="number"
                    step="0.1"
                    value={formData.trailPercent}
                    onChange={(e) => updateFormData('trailPercent', e.target.value)}
                    placeholder="Enter trail percent"
                  />
                </div>
              </div>
            )}

            {/* Time in Force */}
            <div>
              <Label htmlFor="timeInForce">Time in Force</Label>
              <Select value={formData.timeInForce} onValueChange={(value) => updateFormData('timeInForce', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_IN_FORCE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {/* Advanced Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="reduceOnly">Reduce Only</Label>
                <Switch
                  id="reduceOnly"
                  checked={formData.reduceOnly}
                  onCheckedChange={(checked) => updateFormData('reduceOnly', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="postOnly">Post Only</Label>
                <Switch
                  id="postOnly"
                  checked={formData.postOnly}
                  onCheckedChange={(checked) => updateFormData('postOnly', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="iceberg">Iceberg Order</Label>
                <Switch
                  id="iceberg"
                  checked={formData.iceberg}
                  onCheckedChange={(checked) => updateFormData('iceberg', checked)}
                />
              </div>

              {formData.iceberg && (
                <div>
                  <Label htmlFor="icebergQuantity">Iceberg Quantity</Label>
                  <Input
                    id="icebergQuantity"
                    type="number"
                    step="0.0001"
                    value={formData.icebergQuantity}
                    onChange={(e) => updateFormData('icebergQuantity', e.target.value)}
                    placeholder="Enter iceberg quantity"
                  />
                </div>
              )}
            </div>

            {/* Strategy and Agent Assignment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strategy">Strategy (Optional)</Label>
                <Select value={formData.strategyId || ''} onValueChange={(value) => updateFormData('strategyId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Strategy</SelectItem>
                    {availableStrategies.map(strategy => (
                      <SelectItem key={strategy.id} value={strategy.id}>{strategy.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="agent">Agent (Optional)</Label>
                <Select value={formData.agentId || ''} onValueChange={(value) => updateFormData('agentId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Agent</SelectItem>
                    {availableAgents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Max Slippage */}
            <div>
              <Label htmlFor="maxSlippage">Max Slippage (%)</Label>
              <Input
                id="maxSlippage"
                type="number"
                step="0.1"
                value={formData.maxSlippage}
                onChange={(e) => updateFormData('maxSlippage', e.target.value)}
                placeholder="Enter max slippage"
              />
            </div>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            {/* Position Sizing */}
            <div>
              <Label htmlFor="positionSizing">Position Sizing Method</Label>
              <Select value={formData.positionSizing} onValueChange={(value) => updateFormData('positionSizing', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Portfolio Percentage</SelectItem>
                  <SelectItem value="risk_based">Risk-Based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.positionSizing === 'percentage' && (
              <div>
                <Label htmlFor="positionSize">Portfolio Percentage (%)</Label>
                <div className="space-y-2">
                  <Slider
                    value={[parseFloat(formData.positionSize) || 0]}
                    onValueChange={(value) => updateFormData('positionSize', value[0].toString())}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <Input
                    id="positionSize"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.positionSize}
                    onChange={(e) => updateFormData('positionSize', e.target.value)}
                    placeholder="Enter percentage"
                  />
                </div>
              </div>
            )}

            {formData.positionSizing === 'risk_based' && (
              <div>
                <Label htmlFor="riskAmount">Risk Amount ($)</Label>
                <Input
                  id="riskAmount"
                  type="number"
                  step="1"
                  value={formData.riskAmount}
                  onChange={(e) => updateFormData('riskAmount', e.target.value)}
                  placeholder="Enter risk amount"
                />
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={calculatePositionSize}
              className="w-full"
            >
              Calculate Position Size
            </Button>
          </TabsContent>
        </Tabs>

        {/* Order Estimate */}
        {orderEstimate && (
          <div className="space-y-2 p-4 bg-muted/20 rounded-lg">
            <h4 className="font-medium">Order Estimate</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span>Estimated Cost:</span>
                <span className="font-mono">${orderEstimate.estimatedCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Fees:</span>
                <span className="font-mono">${orderEstimate.estimatedFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Slippage:</span>
                <span className="font-mono">${orderEstimate.estimatedSlippage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Margin Required:</span>
                <span className="font-mono">${orderEstimate.marginRequired.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="space-y-1">
            {validationErrors.map((error, index) => (
              <div key={index} className="text-sm text-destructive">{error}</div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || validationErrors.length > 0}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? 'Submitting Order...' : `${formData.side === 'buy' ? 'Buy' : 'Sell'} ${formData.symbol}`}
        </Button>

        {/* Available Buying Power */}
        <div className="text-xs text-muted-foreground text-center">
          Available Buying Power: ${availableBuyingPower.toFixed(2)}
        </div>
      </CardContent>
    </Card>
  );
}