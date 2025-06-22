'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface StrategyCondition {
  id: string;
  type: 'indicator' | 'price' | 'volume' | 'time' | 'custom';
  indicator?: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=' | 'crosses_above' | 'crosses_below';
  value: number | string;
  timeframe?: string;
  enabled: boolean;
}

interface StrategyAction {
  id: string;
  type: 'buy' | 'sell' | 'close_long' | 'close_short' | 'set_stop_loss' | 'set_take_profit' | 'custom';
  quantity: number;
  quantityType: 'fixed' | 'percentage' | 'risk_based';
  price?: 'market' | 'limit' | 'stop';
  priceValue?: number;
  stopLoss?: number;
  takeProfit?: number;
  enabled: boolean;
}

interface StrategyRiskManagement {
  maxPositionSize: number;
  maxPortfolioRisk: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxDailyLoss: number;
  maxConsecutiveLosses: number;
  positionSizing: 'fixed' | 'kelly' | 'volatility_adjusted' | 'risk_parity';
  enableTrailingStop: boolean;
  trailingStopPercent?: number;
}

interface Strategy {
  id?: string;
  name: string;
  description: string;
  type: 'momentum' | 'mean_reversion' | 'arbitrage' | 'market_making' | 'breakout' | 'custom';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  symbols: string[];
  
  // Entry conditions
  entryConditions: StrategyCondition[];
  entryLogic: 'all' | 'any'; // AND or OR logic
  
  // Exit conditions  
  exitConditions: StrategyCondition[];
  exitLogic: 'all' | 'any';
  
  // Actions
  entryActions: StrategyAction[];
  exitActions: StrategyAction[];
  
  // Risk management
  riskManagement: StrategyRiskManagement;
  
  // Advanced settings
  enableShortSelling: boolean;
  enableCompounding: boolean;
  cooldownPeriod: number; // minutes
  maxActivePositions: number;
  
  // Backtesting
  startDate?: Date;
  endDate?: Date;
  initialCapital?: number;
  
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StrategyBuilderProps {
  initialStrategy?: Strategy;
  availableSymbols?: string[];
  availableIndicators?: string[];
  onStrategySave?: (strategy: Strategy) => Promise<void>;
  onStrategyTest?: (strategy: Strategy) => Promise<any>;
  onStrategyBacktest?: (strategy: Strategy) => Promise<any>;
  className?: string;
}

const STRATEGY_TYPES = [
  { value: 'momentum', label: 'Momentum', description: 'Follow price trends and momentum' },
  { value: 'mean_reversion', label: 'Mean Reversion', description: 'Trade against extreme price moves' },
  { value: 'arbitrage', label: 'Arbitrage', description: 'Exploit price differences across markets' },
  { value: 'market_making', label: 'Market Making', description: 'Provide liquidity and capture spreads' },
  { value: 'breakout', label: 'Breakout', description: 'Trade breakouts from consolidation patterns' },
  { value: 'custom', label: 'Custom', description: 'Build your own strategy logic' },
];

const TIMEFRAMES = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
];

const INDICATORS = [
  'SMA', 'EMA', 'RSI', 'MACD', 'Bollinger Bands', 'Stochastic', 'ATR', 'Volume', 'Price', 'ADX', 'CCI', 'Williams %R'
];

const OPERATORS = [
  { value: '>', label: 'Greater than' },
  { value: '<', label: 'Less than' },
  { value: '=', label: 'Equal to' },
  { value: '>=', label: 'Greater than or equal' },
  { value: '<=', label: 'Less than or equal' },
  { value: '!=', label: 'Not equal to' },
  { value: 'crosses_above', label: 'Crosses above' },
  { value: 'crosses_below', label: 'Crosses below' },
];

export function StrategyBuilder({
  initialStrategy,
  availableSymbols = ['BTC', 'ETH', 'AAPL', 'TSLA', 'GOOGL', 'MSFT'],
  availableIndicators = INDICATORS,
  onStrategySave,
  onStrategyTest,
  onStrategyBacktest,
  className,
}: StrategyBuilderProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'StrategyBuilder',
  });

  const [strategy, setStrategy] = useState<Strategy>(initialStrategy || {
    name: '',
    description: '',
    type: 'momentum',
    timeframe: '1h',
    symbols: [],
    entryConditions: [],
    entryLogic: 'all',
    exitConditions: [],
    exitLogic: 'all',
    entryActions: [],
    exitActions: [],
    riskManagement: {
      maxPositionSize: 10000,
      maxPortfolioRisk: 5,
      stopLossPercent: 2,
      takeProfitPercent: 6,
      maxDailyLoss: 1000,
      maxConsecutiveLosses: 3,
      positionSizing: 'fixed',
      enableTrailingStop: false,
    },
    enableShortSelling: false,
    enableCompounding: true,
    cooldownPeriod: 60,
    maxActivePositions: 3,
    isActive: false,
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);

  React.useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Update strategy
  const updateStrategy = (updates: Partial<Strategy>) => {
    setStrategy(prev => ({ ...prev, ...updates, updatedAt: new Date() }));
    setValidationErrors([]);
  };

  // Add condition
  const addCondition = (type: 'entry' | 'exit') => {
    const newCondition: StrategyCondition = {
      id: `condition_${Date.now()}`,
      type: 'indicator',
      indicator: 'RSI',
      operator: '>',
      value: 70,
      timeframe: strategy.timeframe,
      enabled: true,
    };

    if (type === 'entry') {
      updateStrategy({ entryConditions: [...strategy.entryConditions, newCondition] });
    } else {
      updateStrategy({ exitConditions: [...strategy.exitConditions, newCondition] });
    }
  };

  // Update condition
  const updateCondition = (type: 'entry' | 'exit', conditionId: string, updates: Partial<StrategyCondition>) => {
    const conditions = type === 'entry' ? strategy.entryConditions : strategy.exitConditions;
    const updatedConditions = conditions.map(condition => 
      condition.id === conditionId ? { ...condition, ...updates } : condition
    );
    
    if (type === 'entry') {
      updateStrategy({ entryConditions: updatedConditions });
    } else {
      updateStrategy({ exitConditions: updatedConditions });
    }
  };

  // Remove condition
  const removeCondition = (type: 'entry' | 'exit', conditionId: string) => {
    const conditions = type === 'entry' ? strategy.entryConditions : strategy.exitConditions;
    const filteredConditions = conditions.filter(condition => condition.id !== conditionId);
    
    if (type === 'entry') {
      updateStrategy({ entryConditions: filteredConditions });
    } else {
      updateStrategy({ exitConditions: filteredConditions });
    }
  };

  // Add action
  const addAction = (type: 'entry' | 'exit') => {
    const newAction: StrategyAction = {
      id: `action_${Date.now()}`,
      type: type === 'entry' ? 'buy' : 'sell',
      quantity: 100,
      quantityType: 'fixed',
      price: 'market',
      enabled: true,
    };

    if (type === 'entry') {
      updateStrategy({ entryActions: [...strategy.entryActions, newAction] });
    } else {
      updateStrategy({ exitActions: [...strategy.exitActions, newAction] });
    }
  };

  // Update action
  const updateAction = (type: 'entry' | 'exit', actionId: string, updates: Partial<StrategyAction>) => {
    const actions = type === 'entry' ? strategy.entryActions : strategy.exitActions;
    const updatedActions = actions.map(action => 
      action.id === actionId ? { ...action, ...updates } : action
    );
    
    if (type === 'entry') {
      updateStrategy({ entryActions: updatedActions });
    } else {
      updateStrategy({ exitActions: updatedActions });
    }
  };

  // Remove action
  const removeAction = (type: 'entry' | 'exit', actionId: string) => {
    const actions = type === 'entry' ? strategy.entryActions : strategy.exitActions;
    const filteredActions = actions.filter(action => action.id !== actionId);
    
    if (type === 'entry') {
      updateStrategy({ entryActions: filteredActions });
    } else {
      updateStrategy({ exitActions: filteredActions });
    }
  };

  // Validate strategy
  const validateStrategy = (): boolean => {
    const errors: string[] = [];

    if (!strategy.name.trim()) errors.push('Strategy name is required');
    if (strategy.symbols.length === 0) errors.push('At least one symbol must be selected');
    if (strategy.entryConditions.length === 0) errors.push('At least one entry condition is required');
    if (strategy.entryActions.length === 0) errors.push('At least one entry action is required');

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Save strategy
  const handleSave = async () => {
    if (!validateStrategy()) return;

    try {
      if (onStrategySave) {
        await onStrategySave({
          ...strategy,
          id: strategy.id || `strategy_${Date.now()}`,
          createdAt: strategy.createdAt || new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to save strategy:', error);
    }
  };

  // Test strategy
  const handleTest = async () => {
    if (!validateStrategy()) return;

    setIsTesting(true);
    try {
      if (onStrategyTest) {
        await onStrategyTest(strategy);
      }
    } catch (error) {
      console.error('Failed to test strategy:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // Backtest strategy
  const handleBacktest = async () => {
    if (!validateStrategy()) return;

    setIsBacktesting(true);
    try {
      if (onStrategyBacktest) {
        await onStrategyBacktest(strategy);
      }
    } catch (error) {
      console.error('Failed to backtest strategy:', error);
    } finally {
      setIsBacktesting(false);
    }
  };

  // Render condition builder
  const renderCondition = (condition: StrategyCondition, type: 'entry' | 'exit') => (
    <Card key={condition.id} className="p-4">
      <div className="flex items-center gap-4">
        <Switch
          checked={condition.enabled}
          onCheckedChange={(enabled) => updateCondition(type, condition.id, { enabled })}
        />
        
        <Select 
          value={condition.indicator || ''} 
          onValueChange={(indicator) => updateCondition(type, condition.id, { indicator })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableIndicators.map(indicator => (
              <SelectItem key={indicator} value={indicator}>{indicator}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={condition.operator} 
          onValueChange={(operator) => updateCondition(type, condition.id, { operator: operator as any })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map(op => (
              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          value={condition.value}
          onChange={(e) => updateCondition(type, condition.id, { value: parseFloat(e.target.value) })}
          className="w-24"
          placeholder="Value"
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeCondition(type, condition.id)}
          className="text-red-500 hover:text-red-700"
        >
          Remove
        </Button>
      </div>
    </Card>
  );

  // Render action builder
  const renderAction = (action: StrategyAction, type: 'entry' | 'exit') => (
    <Card key={action.id} className="p-4">
      <div className="flex items-center gap-4">
        <Switch
          checked={action.enabled}
          onCheckedChange={(enabled) => updateAction(type, action.id, { enabled })}
        />
        
        <Select 
          value={action.type} 
          onValueChange={(actionType) => updateAction(type, action.id, { type: actionType as any })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
            <SelectItem value="close_long">Close Long</SelectItem>
            <SelectItem value="close_short">Close Short</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="number"
          value={action.quantity}
          onChange={(e) => updateAction(type, action.id, { quantity: parseFloat(e.target.value) })}
          className="w-24"
          placeholder="Quantity"
        />

        <Select 
          value={action.quantityType} 
          onValueChange={(quantityType) => updateAction(type, action.id, { quantityType: quantityType as any })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="percentage">Percentage</SelectItem>
            <SelectItem value="risk_based">Risk Based</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={action.price || 'market'} 
          onValueChange={(price) => updateAction(type, action.id, { price: price as any })}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="market">Market</SelectItem>
            <SelectItem value="limit">Limit</SelectItem>
            <SelectItem value="stop">Stop</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeAction(type, action.id)}
          className="text-red-500 hover:text-red-700"
        >
          Remove
        </Button>
      </div>
    </Card>
  );

  return (
    <div className={cn('w-full max-w-6xl mx-auto space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Strategy Builder</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {strategy.id ? 'Edit existing strategy' : 'Create a new trading strategy'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleTest}
                disabled={isTesting}
              >
                {isTesting ? 'Testing...' : 'Test Strategy'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleBacktest}
                disabled={isBacktesting}
              >
                {isBacktesting ? 'Backtesting...' : 'Backtest'}
              </Button>
              <Button onClick={handleSave}>
                Save Strategy
              </Button>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Strategy Builder Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="entry">Entry Rules</TabsTrigger>
          <TabsTrigger value="exit">Exit Rules</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Strategy Name</Label>
                  <Input
                    id="name"
                    value={strategy.name}
                    onChange={(e) => updateStrategy({ name: e.target.value })}
                    placeholder="Enter strategy name"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Strategy Type</Label>
                  <Select value={strategy.type} onValueChange={(type) => updateStrategy({ type: type as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STRATEGY_TYPES.map(type => (
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
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={strategy.description}
                  onChange={(e) => updateStrategy({ description: e.target.value })}
                  placeholder="Describe your strategy"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeframe">Timeframe</Label>
                  <Select value={strategy.timeframe} onValueChange={(timeframe) => updateStrategy({ timeframe: timeframe as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map(tf => (
                        <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Switch
                      checked={strategy.isActive}
                      onCheckedChange={(isActive) => updateStrategy({ isActive })}
                    />
                    <Label className="text-sm">
                      {strategy.isActive ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <Label>Symbols</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableSymbols.map(symbol => (
                    <Badge
                      key={symbol}
                      variant={strategy.symbols.includes(symbol) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const symbols = strategy.symbols.includes(symbol)
                          ? strategy.symbols.filter(s => s !== symbol)
                          : [...strategy.symbols, symbol];
                        updateStrategy({ symbols });
                      }}
                    >
                      {symbol}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entry" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Entry Conditions</CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Logic:</Label>
                  <Select 
                    value={strategy.entryLogic} 
                    onValueChange={(entryLogic) => updateStrategy({ entryLogic: entryLogic as any })}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">AND</SelectItem>
                      <SelectItem value="any">OR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => addCondition('entry')}>
                    Add Condition
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategy.entryConditions.map(condition => renderCondition(condition, 'entry'))}
              {strategy.entryConditions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No entry conditions defined. Click "Add Condition" to get started.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Entry Actions</CardTitle>
                <Button size="sm" onClick={() => addAction('entry')}>
                  Add Action
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategy.entryActions.map(action => renderAction(action, 'entry'))}
              {strategy.entryActions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No entry actions defined. Click "Add Action" to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Exit Conditions</CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Logic:</Label>
                  <Select 
                    value={strategy.exitLogic} 
                    onValueChange={(exitLogic) => updateStrategy({ exitLogic: exitLogic as any })}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">AND</SelectItem>
                      <SelectItem value="any">OR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => addCondition('exit')}>
                    Add Condition
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategy.exitConditions.map(condition => renderCondition(condition, 'exit'))}
              {strategy.exitConditions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No exit conditions defined. Click "Add Condition" to get started.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Exit Actions</CardTitle>
                <Button size="sm" onClick={() => addAction('exit')}>
                  Add Action
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategy.exitActions.map(action => renderAction(action, 'exit'))}
              {strategy.exitActions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No exit actions defined. Click "Add Action" to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxPositionSize">Max Position Size ($)</Label>
                  <Input
                    id="maxPositionSize"
                    type="number"
                    value={strategy.riskManagement.maxPositionSize}
                    onChange={(e) => updateStrategy({
                      riskManagement: {
                        ...strategy.riskManagement,
                        maxPositionSize: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxPortfolioRisk">Max Portfolio Risk (%)</Label>
                  <Input
                    id="maxPortfolioRisk"
                    type="number"
                    value={strategy.riskManagement.maxPortfolioRisk}
                    onChange={(e) => updateStrategy({
                      riskManagement: {
                        ...strategy.riskManagement,
                        maxPortfolioRisk: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                  <Slider
                    value={[strategy.riskManagement.stopLossPercent]}
                    onValueChange={([value]) => updateStrategy({
                      riskManagement: {
                        ...strategy.riskManagement,
                        stopLossPercent: value
                      }
                    })}
                    max={20}
                    step={0.1}
                    className="mt-2"
                  />
                  <div className="text-center text-sm text-muted-foreground mt-1">
                    {strategy.riskManagement.stopLossPercent}%
                  </div>
                </div>
                <div>
                  <Label htmlFor="takeProfit">Take Profit (%)</Label>
                  <Slider
                    value={[strategy.riskManagement.takeProfitPercent]}
                    onValueChange={([value]) => updateStrategy({
                      riskManagement: {
                        ...strategy.riskManagement,
                        takeProfitPercent: value
                      }
                    })}
                    max={50}
                    step={0.1}
                    className="mt-2"
                  />
                  <div className="text-center text-sm text-muted-foreground mt-1">
                    {strategy.riskManagement.takeProfitPercent}%
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="positionSizing">Position Sizing Method</Label>
                <Select 
                  value={strategy.riskManagement.positionSizing} 
                  onValueChange={(positionSizing) => updateStrategy({
                    riskManagement: {
                      ...strategy.riskManagement,
                      positionSizing: positionSizing as any
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="kelly">Kelly Criterion</SelectItem>
                    <SelectItem value="volatility_adjusted">Volatility Adjusted</SelectItem>
                    <SelectItem value="risk_parity">Risk Parity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={strategy.riskManagement.enableTrailingStop}
                    onCheckedChange={(enableTrailingStop) => updateStrategy({
                      riskManagement: {
                        ...strategy.riskManagement,
                        enableTrailingStop
                      }
                    })}
                  />
                  <Label>Enable Trailing Stop</Label>
                </div>
                
                {strategy.riskManagement.enableTrailingStop && (
                  <div className="flex items-center gap-2">
                    <Label>Trailing %:</Label>
                    <Input
                      type="number"
                      value={strategy.riskManagement.trailingStopPercent || 2}
                      onChange={(e) => updateStrategy({
                        riskManagement: {
                          ...strategy.riskManagement,
                          trailingStopPercent: parseFloat(e.target.value)
                        }
                      })}
                      className="w-20"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={strategy.enableShortSelling}
                    onCheckedChange={(enableShortSelling) => updateStrategy({ enableShortSelling })}
                  />
                  <Label>Enable Short Selling</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={strategy.enableCompounding}
                    onCheckedChange={(enableCompounding) => updateStrategy({ enableCompounding })}
                  />
                  <Label>Enable Compounding</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cooldownPeriod">Cooldown Period (minutes)</Label>
                  <Input
                    id="cooldownPeriod"
                    type="number"
                    value={strategy.cooldownPeriod}
                    onChange={(e) => updateStrategy({ cooldownPeriod: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxActivePositions">Max Active Positions</Label>
                  <Input
                    id="maxActivePositions"
                    type="number"
                    value={strategy.maxActivePositions}
                    onChange={(e) => updateStrategy({ maxActivePositions: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backtest" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Backtest Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={strategy.startDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => updateStrategy({ startDate: new Date(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={strategy.endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => updateStrategy({ endDate: new Date(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="initialCapital">Initial Capital ($)</Label>
                  <Input
                    id="initialCapital"
                    type="number"
                    value={strategy.initialCapital || 100000}
                    onChange={(e) => updateStrategy({ initialCapital: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleBacktest} disabled={isBacktesting} className="flex-1">
                  {isBacktesting ? 'Running Backtest...' : 'Run Backtest'}
                </Button>
                <Button variant="outline" className="flex-1">
                  View Previous Results
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}