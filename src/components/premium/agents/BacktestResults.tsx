'use client';

import React, { useState, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface BacktestTrade {
  id: string;
  entryDate: Date;
  exitDate: Date;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  fees: number;
  duration: number; // hours
  strategy: string;
  reason: string;
}

interface BacktestMetrics {
  // Returns
  totalReturn: number;
  annualizedReturn: number;
  cagr: number;
  
  // Risk metrics
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  volatility: number;
  
  // Trade statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageTradeDuration: number;
  
  // Performance periods
  bestMonth: number;
  worstMonth: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  
  // Risk ratios
  kellyRatio: number;
  expectancy: number;
  recoveryFactor: number;
}

interface BacktestResult {
  id: string;
  strategyName: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalValue: number;
  
  // Time series data
  equityCurve: { date: Date; value: number; drawdown: number }[];
  monthlyReturns: { month: string; return: number }[];
  
  // Trades and metrics
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  
  // Benchmark comparison
  benchmarkReturn?: number;
  beta?: number;
  alpha?: number;
  informationRatio?: number;
  
  // Execution details
  executionTime: number; // seconds
  dataPoints: number;
  commission: number;
  slippage: number;
  
  createdAt: Date;
}

interface BacktestResultsProps {
  results: BacktestResult[];
  selectedResultId?: string;
  onResultSelect?: (resultId: string) => void;
  onCompareResults?: (resultIds: string[]) => void;
  className?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function BacktestResults({
  results,
  selectedResultId,
  onResultSelect,
  onCompareResults,
  className,
}: BacktestResultsProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'BacktestResults',
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [tradeFilter, setTradeFilter] = useState<'all' | 'winning' | 'losing'>('all');

  const selectedResult = useMemo(() => {
    return selectedResultId ? results.find(r => r.id === selectedResultId) : results[0];
  }, [results, selectedResultId]);

  React.useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Filter trades based on current filter
  const filteredTrades = useMemo(() => {
    if (!selectedResult) return [];
    
    switch (tradeFilter) {
      case 'winning':
        return selectedResult.trades.filter(trade => trade.pnl > 0);
      case 'losing':
        return selectedResult.trades.filter(trade => trade.pnl < 0);
      default:
        return selectedResult.trades;
    }
  }, [selectedResult, tradeFilter]);

  // Equity curve chart data
  const equityChartData = useMemo(() => {
    if (!selectedResult) return null;

    return {
      labels: selectedResult.equityCurve.map(point => point.date),
      datasets: [
        {
          label: 'Portfolio Value',
          data: selectedResult.equityCurve.map(point => point.value),
          borderColor: theme.colors.primary,
          backgroundColor: `${theme.colors.primary}20`,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'Drawdown',
          data: selectedResult.equityCurve.map(point => point.drawdown * -1),
          borderColor: theme.colors.loss,
          backgroundColor: `${theme.colors.loss}40`,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          borderWidth: 1,
          yAxisID: 'drawdown',
        },
      ],
    };
  }, [selectedResult, theme]);

  // Monthly returns chart data
  const monthlyReturnsData = useMemo(() => {
    if (!selectedResult) return null;

    return {
      labels: selectedResult.monthlyReturns.map(m => m.month),
      datasets: [
        {
          label: 'Monthly Returns (%)',
          data: selectedResult.monthlyReturns.map(m => m.return * 100),
          backgroundColor: selectedResult.monthlyReturns.map(m => 
            m.return >= 0 ? `${theme.colors.profit}80` : `${theme.colors.loss}80`
          ),
          borderColor: selectedResult.monthlyReturns.map(m => 
            m.return >= 0 ? theme.colors.profit : theme.colors.loss
          ),
          borderWidth: 1,
        },
      ],
    };
  }, [selectedResult, theme]);

  // Chart options
  const equityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: theme.colors.foreground,
        },
      },
      tooltip: {
        backgroundColor: theme.colors.popover,
        titleColor: theme.colors.popoverForeground,
        bodyColor: theme.colors.popoverForeground,
        borderColor: theme.colors.border,
        borderWidth: 1,
        callbacks: {
          title: (context: any) => {
            return new Date(context[0].parsed.x).toLocaleDateString();
          },
          label: (context: any) => {
            if (context.datasetIndex === 0) {
              return `Portfolio: $${Number(context.parsed.y).toLocaleString()}`;
            } else {
              return `Drawdown: ${Number(context.parsed.y).toFixed(2)}%`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
          },
        },
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Portfolio Value ($)',
          color: theme.colors.foreground,
        },
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
          callback: function(value: any) {
            return `$${Number(value).toLocaleString()}`;
          },
        },
      },
      drawdown: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Drawdown (%)',
          color: theme.colors.foreground,
        },
        grid: {
          display: false,
        },
        ticks: {
          color: theme.colors.mutedForeground,
          callback: function(value: any) {
            return `${Number(value).toFixed(1)}%`;
          },
        },
        max: 0,
      },
    },
  };

  const monthlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme.colors.popover,
        titleColor: theme.colors.popoverForeground,
        bodyColor: theme.colors.popoverForeground,
        borderColor: theme.colors.border,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
        },
      },
      y: {
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
          callback: function(value: any) {
            return `${Number(value).toFixed(1)}%`;
          },
        },
        title: {
          display: true,
          text: 'Monthly Return (%)',
          color: theme.colors.foreground,
        },
      },
    },
  };

  if (!selectedResult) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No backtest results available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Results Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Backtest Results</CardTitle>
            <div className="flex items-center gap-2">
              <Select 
                value={selectedResult.id} 
                onValueChange={onResultSelect}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {results.map(result => (
                    <SelectItem key={result.id} value={result.id}>
                      {result.strategyName} - {result.createdAt.toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedResults.length > 1 && (
                <Button onClick={() => onCompareResults?.(selectedResults)}>
                  Compare ({selectedResults.length})
                </Button>
              )}
            </div>
          </div>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-4">
            <div className="text-center">
              <div className={cn(
                'text-xl font-bold',
                selectedResult.metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {selectedResult.metrics.totalReturn >= 0 ? '+' : ''}{(selectedResult.metrics.totalReturn * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Total Return</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {selectedResult.metrics.annualizedReturn ? (selectedResult.metrics.annualizedReturn * 100).toFixed(1) : '--'}%
              </div>
              <div className="text-xs text-muted-foreground">Annualized</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {selectedResult.metrics.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">
                {(selectedResult.metrics.maxDrawdown * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Max Drawdown</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {(selectedResult.metrics.winRate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {selectedResult.metrics.profitFactor.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Profit Factor</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {selectedResult.metrics.totalTrades}
              </div>
              <div className="text-xs text-muted-foreground">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                ${selectedResult.finalValue.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Final Value</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Detailed Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strategy Details */}
            <Card>
              <CardHeader>
                <CardTitle>Strategy Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Strategy:</span>
                    <span className="ml-2 font-medium">{selectedResult.strategyName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Period:</span>
                    <span className="ml-2 font-medium">
                      {selectedResult.startDate.toLocaleDateString()} - {selectedResult.endDate.toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Initial Capital:</span>
                    <span className="ml-2 font-medium">${selectedResult.initialCapital.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data Points:</span>
                    <span className="ml-2 font-medium">{selectedResult.dataPoints.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Commission:</span>
                    <span className="ml-2 font-medium">{(selectedResult.commission * 100).toFixed(3)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Slippage:</span>
                    <span className="ml-2 font-medium">{(selectedResult.slippage * 100).toFixed(3)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Return</span>
                    <span className={cn(
                      'font-medium',
                      selectedResult.metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {selectedResult.metrics.totalReturn >= 0 ? '+' : ''}{(selectedResult.metrics.totalReturn * 100).toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Best Month</span>
                    <span className="font-medium text-green-600">
                      +{(selectedResult.metrics.bestMonth * 100).toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Worst Month</span>
                    <span className="font-medium text-red-600">
                      {(selectedResult.metrics.worstMonth * 100).toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Volatility</span>
                    <span className="font-medium">
                      {(selectedResult.metrics.volatility * 100).toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Execution Time</span>
                    <span className="font-medium">
                      {selectedResult.executionTime.toFixed(2)}s
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Equity Curve */}
          <Card>
            <CardHeader>
              <CardTitle>Equity Curve & Drawdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '400px' }}>
                <Line data={equityChartData} options={equityChartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Return Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Return Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Return</span>
                  <span className="font-medium">{(selectedResult.metrics.totalReturn * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Annualized Return</span>
                  <span className="font-medium">{(selectedResult.metrics.annualizedReturn * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">CAGR</span>
                  <span className="font-medium">{(selectedResult.metrics.cagr * 100).toFixed(2)}%</span>
                </div>
                {selectedResult.benchmarkReturn && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">vs Benchmark</span>
                    <span className="font-medium">{((selectedResult.metrics.totalReturn - selectedResult.benchmarkReturn) * 100).toFixed(2)}%</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                  <span className="font-medium">{selectedResult.metrics.sharpeRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sortino Ratio</span>
                  <span className="font-medium">{selectedResult.metrics.sortinoRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Calmar Ratio</span>
                  <span className="font-medium">{selectedResult.metrics.calmarRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Max Drawdown</span>
                  <span className="font-medium text-red-600">{(selectedResult.metrics.maxDrawdown * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Volatility</span>
                  <span className="font-medium">{(selectedResult.metrics.volatility * 100).toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Trade Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Trade Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Trades</span>
                  <span className="font-medium">{selectedResult.metrics.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="font-medium">{(selectedResult.metrics.winRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Profit Factor</span>
                  <span className="font-medium">{selectedResult.metrics.profitFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Average Win</span>
                  <span className="font-medium text-green-600">${selectedResult.metrics.averageWin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Average Loss</span>
                  <span className="font-medium text-red-600">-${Math.abs(selectedResult.metrics.averageLoss).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Trade History</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={tradeFilter} onValueChange={setTradeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trades</SelectItem>
                      <SelectItem value="winning">Winning</SelectItem>
                      <SelectItem value="losing">Losing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline">
                    {filteredTrades.length} trades
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry Date</TableHead>
                      <TableHead>Exit Date</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead className="text-right">Entry Price</TableHead>
                      <TableHead className="text-right">Exit Price</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead className="text-right">P&L %</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrades.slice(0, 100).map(trade => (
                      <TableRow key={trade.id}>
                        <TableCell className="font-mono text-xs">
                          {trade.entryDate.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {trade.exitDate.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={trade.side === 'long' ? 'default' : 'secondary'}>
                            {trade.side}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${trade.entryPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${trade.exitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {trade.quantity.toFixed(4)}
                        </TableCell>
                        <TableCell className={cn(
                          'text-right font-mono',
                          trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </TableCell>
                        <TableCell className={cn(
                          'text-right font-mono',
                          trade.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {Math.round(trade.duration)}h
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Max Drawdown</span>
                      <span className="text-red-600">{(selectedResult.metrics.maxDrawdown * 100).toFixed(2)}%</span>
                    </div>
                    <Progress value={selectedResult.metrics.maxDrawdown * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Volatility</span>
                      <span>{(selectedResult.metrics.volatility * 100).toFixed(2)}%</span>
                    </div>
                    <Progress value={Math.min(selectedResult.metrics.volatility * 100, 100)} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Kelly Ratio</span>
                      <span>{selectedResult.metrics.kellyRatio.toFixed(3)}</span>
                    </div>
                    <Progress value={Math.min(Math.abs(selectedResult.metrics.kellyRatio) * 100, 100)} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Win/Loss Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedResult.metrics.winningTrades}
                    </div>
                    <div className="text-sm text-muted-foreground">Winning Trades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedResult.metrics.losingTrades}
                    </div>
                    <div className="text-sm text-muted-foreground">Losing Trades</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Largest Win</span>
                    <span className="font-medium text-green-600">${selectedResult.metrics.largestWin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Largest Loss</span>
                    <span className="font-medium text-red-600">-${Math.abs(selectedResult.metrics.largestLoss).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Expectancy</span>
                    <span className="font-medium">${selectedResult.metrics.expectancy.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '400px' }}>
                <Bar data={monthlyReturnsData} options={monthlyChartOptions} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Month</th>
                      <th className="text-right p-2">Return</th>
                      <th className="text-right p-2">Trades</th>
                      <th className="text-right p-2">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResult.monthlyReturns.map((month, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2 font-medium">{month.month}</td>
                        <td className={cn(
                          'p-2 text-right font-mono',
                          month.return >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {month.return >= 0 ? '+' : ''}{(month.return * 100).toFixed(2)}%
                        </td>
                        <td className="p-2 text-right">
                          {/* Calculate trades for this month */}
                          --
                        </td>
                        <td className="p-2 text-right">
                          {/* Calculate win rate for this month */}
                          --
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Utility function to generate mock backtest results
export function generateMockBacktestResults(): BacktestResult[] {
  const strategies = ['Momentum Strategy', 'Mean Reversion', 'Breakout System', 'Arbitrage Bot'];
  
  return strategies.map((strategyName, index) => {
    const startDate = new Date(2023, 0, 1);
    const endDate = new Date(2023, 11, 31);
    const initialCapital = 100000;
    const totalReturn = (Math.random() - 0.3) * 0.8; // -50% to +50% with positive bias
    const finalValue = initialCapital * (1 + totalReturn);
    
    // Generate equity curve
    const equityCurve = [];
    const monthlyReturns = [];
    let currentValue = initialCapital;
    let peak = initialCapital;
    
    for (let i = 0; i < 252; i++) { // 252 trading days
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dailyReturn = (Math.random() - 0.48) * 0.03; // Slight positive bias
      currentValue *= (1 + dailyReturn);
      peak = Math.max(peak, currentValue);
      const drawdown = (currentValue - peak) / peak;
      
      equityCurve.push({
        date,
        value: currentValue,
        drawdown,
      });
    }
    
    // Generate monthly returns
    for (let month = 0; month < 12; month++) {
      monthlyReturns.push({
        month: MONTH_NAMES[month],
        return: (Math.random() - 0.4) * 0.2, // -10% to +10% with positive bias
      });
    }
    
    // Generate trades
    const trades: BacktestTrade[] = [];
    const tradeCount = Math.floor(Math.random() * 100) + 50;
    
    for (let i = 0; i < tradeCount; i++) {
      const entryDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
      const exitDate = new Date(entryDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // Up to 7 days
      const pnl = (Math.random() - 0.4) * 1000; // -$600 to +$600 with positive bias
      
      trades.push({
        id: `trade_${i}`,
        entryDate,
        exitDate,
        symbol: ['AAPL', 'GOOGL', 'MSFT', 'TSLA'][Math.floor(Math.random() * 4)],
        side: Math.random() > 0.5 ? 'long' : 'short',
        entryPrice: Math.random() * 200 + 50,
        exitPrice: Math.random() * 200 + 50,
        quantity: Math.random() * 100 + 10,
        pnl,
        pnlPercent: (Math.random() - 0.4) * 10,
        fees: Math.random() * 10 + 1,
        duration: (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60),
        strategy: strategyName,
        reason: 'Signal triggered',
      });
    }
    
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const winRate = winningTrades / trades.length;
    const totalWins = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    
    return {
      id: `result_${index}`,
      strategyName,
      startDate,
      endDate,
      initialCapital,
      finalValue,
      equityCurve,
      monthlyReturns,
      trades,
      metrics: {
        totalReturn,
        annualizedReturn: Math.pow(1 + totalReturn, 365 / 365) - 1,
        cagr: Math.pow(finalValue / initialCapital, 1) - 1,
        sharpeRatio: Math.random() * 2 + 0.5,
        sortinoRatio: Math.random() * 2.5 + 0.7,
        calmarRatio: Math.random() * 1.5 + 0.3,
        maxDrawdown: Math.random() * 0.3 + 0.05,
        volatility: Math.random() * 0.2 + 0.1,
        totalTrades: trades.length,
        winningTrades,
        losingTrades,
        winRate,
        profitFactor: totalWins / (totalLosses || 1),
        averageWin: totalWins / (winningTrades || 1),
        averageLoss: totalLosses / (losingTrades || 1),
        largestWin: Math.max(...trades.map(t => t.pnl)),
        largestLoss: Math.min(...trades.map(t => t.pnl)),
        averageTradeDuration: trades.reduce((sum, t) => sum + t.duration, 0) / trades.length,
        bestMonth: Math.max(...monthlyReturns.map(m => m.return)),
        worstMonth: Math.min(...monthlyReturns.map(m => m.return)),
        consecutiveWins: Math.floor(Math.random() * 10) + 3,
        consecutiveLosses: Math.floor(Math.random() * 5) + 1,
        kellyRatio: Math.random() * 0.5,
        expectancy: totalWins / trades.length - totalLosses / trades.length,
        recoveryFactor: Math.random() * 5 + 1,
      },
      benchmarkReturn: totalReturn * 0.7, // Benchmark slightly worse
      beta: Math.random() * 0.5 + 0.8,
      alpha: totalReturn * 0.3,
      informationRatio: Math.random() * 1.5,
      executionTime: Math.random() * 30 + 5,
      dataPoints: 252 * 390, // 252 days * 390 minutes per day
      commission: 0.001,
      slippage: 0.0005,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    };
  });
}