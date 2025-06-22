'use client';

import React, { useState, useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface AgentPerformanceData {
  agentId: string;
  agentName: string;
  type: string;
  
  // Time series performance data
  equityCurve: { date: Date; value: number; dailyReturn: number }[];
  
  // Performance metrics
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  
  // Trading statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageHoldTime: number; // hours
  
  // Risk metrics
  valueAtRisk95: number;
  expectedShortfall: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  
  // Activity metrics
  tradingFrequency: number; // trades per day
  averagePosition: number;
  utilizationRate: number;
  
  // Symbol performance breakdown
  symbolPerformance: {
    symbol: string;
    trades: number;
    pnl: number;
    winRate: number;
    allocation: number;
  }[];
  
  // Strategy performance breakdown
  strategyPerformance: {
    strategy: string;
    trades: number;
    pnl: number;
    winRate: number;
    allocation: number;
  }[];
  
  // Monthly performance
  monthlyReturns: {
    month: string;
    return: number;
    trades: number;
  }[];
  
  // Risk attribution
  riskAttribution: {
    factor: string;
    contribution: number;
    percentage: number;
  }[];
}

interface AgentPerformanceProps {
  agentId: string;
  data: AgentPerformanceData;
  benchmarkData?: { date: Date; value: number }[];
  timeRange?: '1M' | '3M' | '6M' | '1Y' | 'ALL';
  onTimeRangeChange?: (range: string) => void;
  className?: string;
}

const TIME_RANGES = [
  { value: '1M', label: '1 Month' },
  { value: '3M', label: '3 Months' },
  { value: '6M', label: '6 Months' },
  { value: '1Y', label: '1 Year' },
  { value: 'ALL', label: 'All Time' },
];

export function AgentPerformance({
  agentId,
  data,
  benchmarkData = [],
  timeRange = '1Y',
  onTimeRangeChange,
  className,
}: AgentPerformanceProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'AgentPerformance',
  });

  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [activeTab, setActiveTab] = useState('overview');

  // Filter data by time range
  const filteredData = useMemo(() => {
    if (!data.equityCurve.length) return data;
    
    const now = new Date();
    let startDate = new Date();
    
    switch (selectedTimeRange) {
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'ALL':
        return data;
    }
    
    const filteredEquityCurve = data.equityCurve.filter(point => point.date >= startDate);
    
    return {
      ...data,
      equityCurve: filteredEquityCurve,
    };
  }, [data, selectedTimeRange]);

  const filteredBenchmark = useMemo(() => {
    if (!benchmarkData.length || !filteredData.equityCurve.length) return [];
    
    const startDate = filteredData.equityCurve[0]?.date;
    if (!startDate) return [];
    
    return benchmarkData.filter(point => point.date >= startDate);
  }, [benchmarkData, filteredData]);

  React.useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Equity curve chart data
  const equityChartData = useMemo(() => {
    const datasets: any[] = [];

    // Agent performance
    if (filteredData.equityCurve.length > 0) {
      datasets.push({
        label: data.agentName,
        data: filteredData.equityCurve.map(point => ({
          x: point.date,
          y: point.value,
        })),
        borderColor: theme.colors.primary,
        backgroundColor: `${theme.colors.primary}20`,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 2,
      });
    }

    // Benchmark comparison
    if (filteredBenchmark.length > 0) {
      datasets.push({
        label: 'Benchmark',
        data: filteredBenchmark.map(point => ({
          x: point.date,
          y: point.value,
        })),
        borderColor: theme.colors.muted,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [5, 5],
      });
    }

    return { datasets };
  }, [filteredData, filteredBenchmark, data.agentName, theme]);

  // Daily returns histogram
  const returnsHistogramData = useMemo(() => {
    const returns = filteredData.equityCurve.map(point => point.dailyReturn * 100);
    const bins = 30;
    const min = Math.min(...returns);
    const max = Math.max(...returns);
    const binWidth = (max - min) / bins;
    
    const histogram = new Array(bins).fill(0);
    const labels = [];
    
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = min + (i + 1) * binWidth;
      labels.push(`${binStart.toFixed(1)}%`);
      
      returns.forEach(ret => {
        if (ret >= binStart && ret < binEnd) {
          histogram[i]++;
        }
      });
    }

    return {
      labels,
      datasets: [{
        label: 'Frequency',
        data: histogram,
        backgroundColor: `${theme.colors.primary}60`,
        borderColor: theme.colors.primary,
        borderWidth: 1,
      }],
    };
  }, [filteredData, theme]);

  // Symbol performance chart
  const symbolPerformanceData = useMemo(() => {
    const topSymbols = [...data.symbolPerformance]
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 10);

    return {
      labels: topSymbols.map(s => s.symbol),
      datasets: [{
        label: 'P&L ($)',
        data: topSymbols.map(s => s.pnl),
        backgroundColor: topSymbols.map(s => 
          s.pnl >= 0 ? `${theme.colors.profit}80` : `${theme.colors.loss}80`
        ),
        borderColor: topSymbols.map(s => 
          s.pnl >= 0 ? theme.colors.profit : theme.colors.loss
        ),
        borderWidth: 1,
      }],
    };
  }, [data.symbolPerformance, theme]);

  // Risk attribution chart
  const riskAttributionData = useMemo(() => {
    return {
      labels: data.riskAttribution.map(r => r.factor),
      datasets: [{
        data: data.riskAttribution.map(r => Math.abs(r.percentage)),
        backgroundColor: [
          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
          '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
        ],
        borderColor: theme.colors.background,
        borderWidth: 2,
      }],
    };
  }, [data.riskAttribution, theme]);

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
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
          callback: function(value: any) {
            return `$${Number(value).toLocaleString()}`;
          },
        },
        title: {
          display: true,
          text: 'Portfolio Value ($)',
          color: theme.colors.foreground,
        },
      },
    },
  };

  const histogramOptions = {
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
        title: {
          display: true,
          text: 'Daily Return (%)',
          color: theme.colors.foreground,
        },
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Frequency',
          color: theme.colors.foreground,
        },
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
        },
      },
    },
  };

  const symbolChartOptions = {
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
            return `$${Number(value).toLocaleString()}`;
          },
        },
        title: {
          display: true,
          text: 'P&L ($)',
          color: theme.colors.foreground,
        },
      },
    },
  };

  const riskChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: theme.colors.foreground,
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: theme.colors.popover,
        titleColor: theme.colors.popoverForeground,
        bodyColor: theme.colors.popoverForeground,
        borderColor: theme.colors.border,
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const item = data.riskAttribution[context.dataIndex];
            return `${item.factor}: ${item.percentage.toFixed(1)}% (${item.contribution >= 0 ? '+' : ''}${item.contribution.toFixed(3)})`;
          },
        },
      },
    },
  };

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>{data.agentName} Performance</span>
                <Badge variant="outline">{data.type}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Detailed performance analysis and metrics
              </p>
            </div>
            
            <Select value={selectedTimeRange} onValueChange={(value) => {
              setSelectedTimeRange(value);
              onTimeRangeChange?.(value);
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-4">
            <div className="text-center">
              <div className={cn(
                'text-xl font-bold',
                data.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {data.totalReturn >= 0 ? '+' : ''}{(data.totalReturn * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Total Return</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {(data.annualizedReturn * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Annualized</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {data.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">
                {(data.maxDrawdown * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Max Drawdown</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {(data.winRate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {data.profitFactor.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Profit Factor</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {data.totalTrades}
              </div>
              <div className="text-xs text-muted-foreground">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {data.tradingFrequency.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Trades/Day</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Analysis */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="symbols">Symbols</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Equity Curve */}
          <Card>
            <CardHeader>
              <CardTitle>Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '400px' }}>
                <Line data={equityChartData} options={equityChartOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Return Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Return</span>
                  <span className="font-medium">{(data.totalReturn * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Annualized Return</span>
                  <span className="font-medium">{(data.annualizedReturn * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Volatility</span>
                  <span className="font-medium">{(data.volatility * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Alpha</span>
                  <span className="font-medium">{(data.alpha * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Beta</span>
                  <span className="font-medium">{data.beta.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                  <span className="font-medium">{data.sharpeRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Calmar Ratio</span>
                  <span className="font-medium">{data.calmarRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Information Ratio</span>
                  <span className="font-medium">{data.informationRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">VaR 95%</span>
                  <span className="font-medium">{(data.valueAtRisk95 * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Expected Shortfall</span>
                  <span className="font-medium">{(data.expectedShortfall * 100).toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trading Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Trades</span>
                  <span className="font-medium">{data.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="font-medium">{(data.winRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Profit Factor</span>
                  <span className="font-medium">{data.profitFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Hold Time</span>
                  <span className="font-medium">{data.averageHoldTime.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Trading Frequency</span>
                  <span className="font-medium">{data.tradingFrequency.toFixed(1)}/day</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="returns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Returns Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '400px' }}>
                <Bar data={returnsHistogramData} options={histogramOptions} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Win/Loss Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{data.winningTrades}</div>
                    <div className="text-sm text-muted-foreground">Winning Trades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{data.losingTrades}</div>
                    <div className="text-sm text-muted-foreground">Losing Trades</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Win</span>
                    <span className="font-medium text-green-600">${data.averageWin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Loss</span>
                    <span className="font-medium text-red-600">-${Math.abs(data.averageLoss).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Largest Win</span>
                    <span className="font-medium text-green-600">${data.largestWin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Largest Loss</span>
                    <span className="font-medium text-red-600">-${Math.abs(data.largestLoss).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.monthlyReturns.map((month, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{month.month}</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={Math.abs(month.return) * 100} 
                          className="w-20 h-2"
                        />
                        <span className={cn(
                          'text-sm font-medium w-16 text-right',
                          month.return >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {month.return >= 0 ? '+' : ''}{(month.return * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Max Drawdown</span>
                    <span className="text-red-600">{(data.maxDrawdown * 100).toFixed(2)}%</span>
                  </div>
                  <Progress value={data.maxDrawdown * 100} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Volatility</span>
                    <span>{(data.volatility * 100).toFixed(2)}%</span>
                  </div>
                  <Progress value={Math.min(data.volatility * 100, 100)} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>VaR 95%</span>
                    <span className="text-red-600">{(Math.abs(data.valueAtRisk95) * 100).toFixed(2)}%</span>
                  </div>
                  <Progress value={Math.abs(data.valueAtRisk95) * 100} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Beta</span>
                    <span>{data.beta.toFixed(2)}</span>
                  </div>
                  <Progress value={Math.min(Math.abs(data.beta) * 50, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Attribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: '300px' }}>
                  <Doughnut data={riskAttributionData} options={riskChartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="symbols" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Symbol Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '400px' }}>
                <Bar data={symbolPerformanceData} options={symbolChartOptions} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Symbol Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Symbol</th>
                      <th className="text-right p-2">Trades</th>
                      <th className="text-right p-2">P&L</th>
                      <th className="text-right p-2">Win Rate</th>
                      <th className="text-right p-2">Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.symbolPerformance.map((symbol, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{symbol.symbol}</td>
                        <td className="p-2 text-right">{symbol.trades}</td>
                        <td className={cn(
                          'p-2 text-right font-mono',
                          symbol.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {symbol.pnl >= 0 ? '+' : ''}${symbol.pnl.toFixed(2)}
                        </td>
                        <td className="p-2 text-right">{(symbol.winRate * 100).toFixed(1)}%</td>
                        <td className="p-2 text-right">{(symbol.allocation * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Strategy</th>
                      <th className="text-right p-2">Trades</th>
                      <th className="text-right p-2">P&L</th>
                      <th className="text-right p-2">Win Rate</th>
                      <th className="text-right p-2">Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.strategyPerformance.map((strategy, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{strategy.strategy}</td>
                        <td className="p-2 text-right">{strategy.trades}</td>
                        <td className={cn(
                          'p-2 text-right font-mono',
                          strategy.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {strategy.pnl >= 0 ? '+' : ''}${strategy.pnl.toFixed(2)}
                        </td>
                        <td className="p-2 text-right">{(strategy.winRate * 100).toFixed(1)}%</td>
                        <td className="p-2 text-right">{(strategy.allocation * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attribution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.riskAttribution.map((attribution, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{attribution.factor}</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.abs(attribution.percentage)} 
                        className="w-32 h-2"
                      />
                      <span className={cn(
                        'text-sm font-mono w-16 text-right',
                        attribution.contribution >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {attribution.contribution >= 0 ? '+' : ''}{attribution.contribution.toFixed(3)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Utility function to generate mock agent performance data
export function generateMockAgentPerformanceData(): AgentPerformanceData {
  const agentTypes = ['Momentum', 'Mean Reversion', 'Arbitrage', 'Market Making'];
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX'];
  const strategies = ['Strategy A', 'Strategy B', 'Strategy C'];
  const riskFactors = ['Market Risk', 'Sector Risk', 'Idiosyncratic Risk', 'Currency Risk', 'Liquidity Risk'];
  
  // Generate equity curve
  const equityCurve = [];
  let value = 100000;
  for (let i = 0; i < 252; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (252 - i));
    const dailyReturn = (Math.random() - 0.48) * 0.03;
    value *= (1 + dailyReturn);
    equityCurve.push({ date, value, dailyReturn });
  }
  
  const totalReturn = (value - 100000) / 100000;
  
  return {
    agentId: 'agent_1',
    agentName: `${agentTypes[Math.floor(Math.random() * agentTypes.length)]} Agent`,
    type: agentTypes[Math.floor(Math.random() * agentTypes.length)],
    equityCurve,
    totalReturn,
    annualizedReturn: totalReturn * (365 / 252),
    volatility: Math.random() * 0.2 + 0.1,
    sharpeRatio: Math.random() * 2 + 0.5,
    maxDrawdown: Math.random() * 0.2 + 0.05,
    calmarRatio: Math.random() * 1.5 + 0.5,
    winRate: Math.random() * 0.4 + 0.4,
    profitFactor: Math.random() * 2 + 0.8,
    totalTrades: Math.floor(Math.random() * 500) + 100,
    winningTrades: Math.floor(Math.random() * 300) + 60,
    losingTrades: Math.floor(Math.random() * 200) + 40,
    averageWin: Math.random() * 500 + 100,
    averageLoss: -(Math.random() * 300 + 50),
    largestWin: Math.random() * 2000 + 500,
    largestLoss: -(Math.random() * 1000 + 200),
    averageHoldTime: Math.random() * 48 + 2,
    valueAtRisk95: -(Math.random() * 0.05 + 0.01),
    expectedShortfall: -(Math.random() * 0.08 + 0.02),
    beta: Math.random() * 0.8 + 0.6,
    alpha: Math.random() * 0.1 - 0.05,
    informationRatio: Math.random() * 1.5,
    tradingFrequency: Math.random() * 5 + 1,
    averagePosition: Math.random() * 50000 + 10000,
    utilizationRate: Math.random() * 0.4 + 0.6,
    symbolPerformance: symbols.map(symbol => ({
      symbol,
      trades: Math.floor(Math.random() * 50) + 10,
      pnl: (Math.random() - 0.4) * 5000,
      winRate: Math.random() * 0.6 + 0.2,
      allocation: Math.random() * 0.2 + 0.05,
    })),
    strategyPerformance: strategies.map(strategy => ({
      strategy,
      trades: Math.floor(Math.random() * 100) + 20,
      pnl: (Math.random() - 0.4) * 8000,
      winRate: Math.random() * 0.6 + 0.3,
      allocation: Math.random() * 0.4 + 0.2,
    })),
    monthlyReturns: Array.from({ length: 12 }, (_, i) => ({
      month: `2023-${(i + 1).toString().padStart(2, '0')}`,
      return: (Math.random() - 0.4) * 0.15,
      trades: Math.floor(Math.random() * 30) + 5,
    })),
    riskAttribution: riskFactors.map(factor => ({
      factor,
      contribution: (Math.random() - 0.5) * 0.02,
      percentage: Math.random() * 40 + 10,
    })),
  };
}