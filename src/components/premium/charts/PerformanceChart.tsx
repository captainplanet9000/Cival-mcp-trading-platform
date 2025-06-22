'use client';

import React, { useState, useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface PerformanceData {
  date: Date;
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
  benchmark?: number;
  drawdown: number;
  sharpeRatio: number;
  volatility: number;
}

interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  calmarRatio: number;
  informationRatio: number;
  beta: number;
  alpha: number;
}

interface MonthlyReturns {
  [year: number]: {
    [month: number]: number;
  };
}

interface PerformanceChartProps {
  data: PerformanceData[];
  benchmarkData?: PerformanceData[];
  metrics: PerformanceMetrics;
  monthlyReturns?: MonthlyReturns;
  timeRange?: '1M' | '3M' | '6M' | '1Y' | '2Y' | 'ALL';
  enableBenchmarkComparison?: boolean;
  height?: number;
  className?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function PerformanceChart({
  data,
  benchmarkData = [],
  metrics,
  monthlyReturns = {},
  timeRange = '1Y',
  enableBenchmarkComparison = true,
  height = 400,
  className,
}: PerformanceChartProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'PerformanceChart',
  });

  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [activeTab, setActiveTab] = useState('equity');

  // Filter data by time range
  const filteredData = useMemo(() => {
    if (!data.length) return [];
    
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
      case '2Y':
        startDate.setFullYear(now.getFullYear() - 2);
        break;
      case 'ALL':
        return data;
    }
    
    return data.filter(point => point.date >= startDate);
  }, [data, selectedTimeRange]);

  const filteredBenchmarkData = useMemo(() => {
    if (!benchmarkData.length) return [];
    
    const startDate = filteredData[0]?.date;
    if (!startDate) return [];
    
    return benchmarkData.filter(point => point.date >= startDate);
  }, [benchmarkData, filteredData]);

  // Equity curve chart data
  const equityChartData = useMemo(() => {
    const datasets: any[] = [];

    // Portfolio equity curve
    if (filteredData.length > 0) {
      datasets.push({
        label: 'Portfolio',
        data: filteredData.map(point => ({
          x: point.date,
          y: point.portfolioValue,
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
    if (enableBenchmarkComparison && filteredBenchmarkData.length > 0) {
      datasets.push({
        label: 'Benchmark',
        data: filteredBenchmarkData.map(point => ({
          x: point.date,
          y: point.benchmark || point.portfolioValue,
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
  }, [filteredData, filteredBenchmarkData, enableBenchmarkComparison, theme]);

  // Drawdown chart data
  const drawdownChartData = useMemo(() => ({
    datasets: [{
      label: 'Drawdown',
      data: filteredData.map(point => ({
        x: point.date,
        y: point.drawdown * -1, // Make negative for visual clarity
      })),
      borderColor: theme.colors.loss,
      backgroundColor: `${theme.colors.loss}40`,
      fill: true,
      tension: 0.1,
      pointRadius: 0,
      borderWidth: 2,
    }],
  }), [filteredData, theme]);

  // Daily returns histogram
  const dailyReturnsData = useMemo(() => {
    const returns = filteredData.map(point => point.dailyReturn * 100);
    const bins = 50;
    const min = Math.min(...returns);
    const max = Math.max(...returns);
    const binWidth = (max - min) / bins;
    
    const histogram = new Array(bins).fill(0);
    const labels = [];
    
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = min + (i + 1) * binWidth;
      labels.push(`${binStart.toFixed(2)}%`);
      
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

  // Monthly returns heatmap data
  const monthlyReturnsData = useMemo(() => {
    const years = Object.keys(monthlyReturns).map(Number).sort();
    const heatmapData = [];
    
    for (const year of years) {
      for (let month = 0; month < 12; month++) {
        const returnValue = monthlyReturns[year]?.[month] || 0;
        heatmapData.push({
          x: MONTH_NAMES[month],
          y: year.toString(),
          v: returnValue * 100,
        });
      }
    }

    return {
      datasets: [{
        label: 'Monthly Returns (%)',
        data: heatmapData,
        backgroundColor: (context: any) => {
          const value = context.parsed.v;
          const intensity = Math.min(Math.abs(value) / 10, 1);
          return value >= 0 
            ? `rgba(34, 197, 94, ${intensity})` 
            : `rgba(239, 68, 68, ${intensity})`;
        },
        borderColor: theme.colors.border,
        borderWidth: 1,
      }],
    };
  }, [monthlyReturns, theme]);

  // Chart options
  const commonOptions = {
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
        },
      },
    },
  };

  const equityOptions = {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      x: {
        ...commonOptions.scales.x,
        type: 'time' as const,
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
          },
        },
      },
      y: {
        ...commonOptions.scales.y,
        title: {
          display: true,
          text: 'Portfolio Value ($)',
          color: theme.colors.foreground,
        },
        ticks: {
          ...commonOptions.scales.y.ticks,
          callback: function(value: any) {
            return `$${Number(value).toLocaleString()}`;
          },
        },
      },
    },
  };

  const drawdownOptions = {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      x: {
        ...commonOptions.scales.x,
        type: 'time' as const,
      },
      y: {
        ...commonOptions.scales.y,
        title: {
          display: true,
          text: 'Drawdown (%)',
          color: theme.colors.foreground,
        },
        ticks: {
          ...commonOptions.scales.y.ticks,
          callback: function(value: any) {
            return `${Number(value).toFixed(1)}%`;
          },
        },
        max: 0,
      },
    },
  };

  const returnsOptions = {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      x: {
        ...commonOptions.scales.x,
        title: {
          display: true,
          text: 'Daily Return (%)',
          color: theme.colors.foreground,
        },
      },
      y: {
        ...commonOptions.scales.y,
        title: {
          display: true,
          text: 'Frequency',
          color: theme.colors.foreground,
        },
      },
    },
  };

  React.useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Performance Analysis</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1M">1M</SelectItem>
                <SelectItem value="3M">3M</SelectItem>
                <SelectItem value="6M">6M</SelectItem>
                <SelectItem value="1Y">1Y</SelectItem>
                <SelectItem value="2Y">2Y</SelectItem>
                <SelectItem value="ALL">ALL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Performance Metrics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
          <div className="text-center">
            <div className={cn(
              'text-lg font-bold',
              metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {metrics.totalReturn >= 0 ? '+' : ''}{(metrics.totalReturn * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">Total Return</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {(metrics.annualizedReturn * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">Annualized</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {metrics.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">
              {(metrics.maxDrawdown * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">Max Drawdown</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {(metrics.volatility * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">Volatility</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {(metrics.winRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="equity">Equity Curve</TabsTrigger>
            <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
            <TabsTrigger value="returns">Returns</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="equity" className="mt-4">
            <div style={{ height: `${height}px` }}>
              <Line data={equityChartData} options={equityOptions} />
            </div>
          </TabsContent>

          <TabsContent value="drawdown" className="mt-4">
            <div style={{ height: `${height}px` }}>
              <Line data={drawdownChartData} options={drawdownOptions} />
            </div>
          </TabsContent>

          <TabsContent value="returns" className="mt-4">
            <div style={{ height: `${height}px` }}>
              <Bar data={dailyReturnsData} options={returnsOptions} />
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <div className="space-y-4">
              {/* Monthly returns table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Year</th>
                      {MONTH_NAMES.map(month => (
                        <th key={month} className="text-center p-2 w-16">{month}</th>
                      ))}
                      <th className="text-center p-2">YTD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(monthlyReturns).map(yearStr => {
                      const year = parseInt(yearStr);
                      const yearData = monthlyReturns[year] || {};
                      const ytd = Object.values(yearData).reduce((sum, ret) => sum + ret, 0);
                      
                      return (
                        <tr key={year}>
                          <td className="p-2 font-medium">{year}</td>
                          {MONTH_NAMES.map((month, index) => {
                            const value = yearData[index] || 0;
                            return (
                              <td
                                key={month}
                                className={cn(
                                  'text-center p-2 text-xs',
                                  value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-muted-foreground'
                                )}
                                style={{
                                  backgroundColor: value !== 0 
                                    ? `${value > 0 ? 'rgba(34, 197, 94,' : 'rgba(239, 68, 68,'} ${Math.min(Math.abs(value) * 5, 0.3)})` 
                                    : 'transparent'
                                }}
                              >
                                {value !== 0 ? `${(value * 100).toFixed(1)}%` : '--'}
                              </td>
                            );
                          })}
                          <td className={cn(
                            'text-center p-2 font-medium',
                            ytd > 0 ? 'text-green-600' : ytd < 0 ? 'text-red-600' : 'text-muted-foreground'
                          )}>
                            {(ytd * 100).toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Additional metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-sm font-medium">{metrics.sortinoRatio.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Sortino Ratio</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{metrics.calmarRatio.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Calmar Ratio</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{metrics.profitFactor.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Profit Factor</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{metrics.beta.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Beta</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Utility function to generate mock performance data
export function generateMockPerformanceData(days: number = 365): {
  data: PerformanceData[];
  metrics: PerformanceMetrics;
  monthlyReturns: MonthlyReturns;
} {
  const data: PerformanceData[] = [];
  const monthlyReturns: MonthlyReturns = {};
  
  let portfolioValue = 100000;
  let peak = portfolioValue;
  let totalReturn = 0;
  let dailyReturns: number[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    // Generate realistic daily return
    const dailyReturn = (Math.random() - 0.48) * 0.03; // Slight positive bias
    dailyReturns.push(dailyReturn);
    
    portfolioValue *= (1 + dailyReturn);
    peak = Math.max(peak, portfolioValue);
    const drawdown = (portfolioValue - peak) / peak;
    
    data.push({
      date,
      portfolioValue,
      dailyReturn,
      cumulativeReturn: (portfolioValue - 100000) / 100000,
      drawdown,
      sharpeRatio: 0, // Will be calculated
      volatility: 0, // Will be calculated
    });
    
    // Track monthly returns
    const year = date.getFullYear();
    const month = date.getMonth();
    if (!monthlyReturns[year]) monthlyReturns[year] = {};
    if (!monthlyReturns[year][month]) monthlyReturns[year][month] = 0;
    monthlyReturns[year][month] += dailyReturn;
  }
  
  // Calculate metrics
  totalReturn = (portfolioValue - 100000) / 100000;
  const annualizedReturn = Math.pow(1 + totalReturn, 365 / days) - 1;
  const volatility = Math.sqrt(dailyReturns.reduce((sum, ret) => sum + ret * ret, 0) / dailyReturns.length) * Math.sqrt(252);
  const sharpeRatio = annualizedReturn / volatility;
  const maxDrawdown = Math.min(...data.map(d => d.drawdown));
  
  const metrics: PerformanceMetrics = {
    totalReturn,
    annualizedReturn,
    volatility,
    sharpeRatio,
    sortinoRatio: sharpeRatio * 1.2, // Approximation
    maxDrawdown: Math.abs(maxDrawdown),
    winRate: dailyReturns.filter(r => r > 0).length / dailyReturns.length,
    profitFactor: 1.5, // Mock value
    calmarRatio: annualizedReturn / Math.abs(maxDrawdown),
    informationRatio: 0.8, // Mock value
    beta: 1.1, // Mock value
    alpha: 0.02, // Mock value
  };
  
  return { data, metrics, monthlyReturns };
}