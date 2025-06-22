'use client';

import React, { useState, useMemo } from 'react';
import { Doughnut, Bar, TreemapChart } from 'react-chartjs-2';
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

interface AllocationData {
  symbol: string;
  name?: string;
  sector?: string;
  assetClass?: string;
  geography?: string;
  marketValue: number;
  allocation: percentage;
  targetAllocation?: number;
  cost: number;
  unrealizedPnL: number;
  dayChange: number;
  dayChangePercent: number;
  weight: number;
  risk: 'low' | 'medium' | 'high';
  liquidity: 'high' | 'medium' | 'low';
}

interface PortfolioAllocationProps {
  data: AllocationData[];
  totalValue: number;
  viewType?: 'doughnut' | 'bar' | 'treemap' | 'table';
  groupBy?: 'symbol' | 'sector' | 'asset_class' | 'geography' | 'risk' | 'liquidity';
  showTargetAllocation?: boolean;
  enableRebalancing?: boolean;
  minAllocationThreshold?: number;
  height?: number;
  className?: string;
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#F43F5E', '#8B5A2B', '#6B7280', '#059669',
];

const GROUP_BY_OPTIONS = [
  { value: 'symbol', label: 'Individual Assets' },
  { value: 'sector', label: 'By Sector' },
  { value: 'asset_class', label: 'By Asset Class' },
  { value: 'geography', label: 'By Geography' },
  { value: 'risk', label: 'By Risk Level' },
  { value: 'liquidity', label: 'By Liquidity' },
];

export function PortfolioAllocation({
  data,
  totalValue,
  viewType = 'doughnut',
  groupBy = 'symbol',
  showTargetAllocation = false,
  enableRebalancing = false,
  minAllocationThreshold = 0.01, // 1%
  height = 400,
  className,
}: PortfolioAllocationProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'PortfolioAllocation',
  });

  const [selectedViewType, setSelectedViewType] = useState(viewType);
  const [selectedGroupBy, setSelectedGroupBy] = useState(groupBy);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Group and aggregate data
  const groupedData = useMemo(() => {
    if (selectedGroupBy === 'symbol') {
      return data.map(item => ({
        label: item.symbol,
        value: item.marketValue,
        allocation: item.allocation,
        targetAllocation: item.targetAllocation,
        count: 1,
        items: [item],
        dayChange: item.dayChange,
        dayChangePercent: item.dayChangePercent,
        unrealizedPnL: item.unrealizedPnL,
        risk: item.risk,
      }));
    }

    const groups: { [key: string]: AllocationData[] } = {};
    
    data.forEach(item => {
      let groupKey = 'Other';
      
      switch (selectedGroupBy) {
        case 'sector':
          groupKey = item.sector || 'Unknown';
          break;
        case 'asset_class':
          groupKey = item.assetClass || 'Unknown';
          break;
        case 'geography':
          groupKey = item.geography || 'Unknown';
          break;
        case 'risk':
          groupKey = item.risk;
          break;
        case 'liquidity':
          groupKey = item.liquidity;
          break;
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });

    return Object.entries(groups).map(([label, items]) => {
      const totalMarketValue = items.reduce((sum, item) => sum + item.marketValue, 0);
      const totalAllocation = items.reduce((sum, item) => sum + item.allocation, 0);
      const totalTargetAllocation = items.reduce((sum, item) => sum + (item.targetAllocation || 0), 0);
      const totalDayChange = items.reduce((sum, item) => sum + item.dayChange, 0);
      const totalUnrealizedPnL = items.reduce((sum, item) => sum + item.unrealizedPnL, 0);
      const avgDayChangePercent = items.reduce((sum, item) => sum + item.dayChangePercent * item.allocation, 0) / totalAllocation;
      
      // Determine group risk level
      const riskCounts = { low: 0, medium: 0, high: 0 };
      items.forEach(item => riskCounts[item.risk]++);
      const dominantRisk = Object.entries(riskCounts).reduce((a, b) => riskCounts[a[0] as keyof typeof riskCounts] > riskCounts[b[0] as keyof typeof riskCounts] ? a : b)[0] as 'low' | 'medium' | 'high';

      return {
        label,
        value: totalMarketValue,
        allocation: totalAllocation,
        targetAllocation: showTargetAllocation ? totalTargetAllocation : undefined,
        count: items.length,
        items,
        dayChange: totalDayChange,
        dayChangePercent: avgDayChangePercent,
        unrealizedPnL: totalUnrealizedPnL,
        risk: dominantRisk,
      };
    }).filter(group => group.allocation >= minAllocationThreshold)
      .sort((a, b) => b.value - a.value);
  }, [data, selectedGroupBy, showTargetAllocation, minAllocationThreshold]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDayChange = data.reduce((sum, item) => sum + item.dayChange, 0);
    const totalUnrealizedPnL = data.reduce((sum, item) => sum + item.unrealizedPnL, 0);
    const avgDayChangePercent = totalValue > 0 ? (totalDayChange / totalValue) * 100 : 0;
    const totalPnLPercent = totalValue > 0 ? (totalUnrealizedPnL / (totalValue - totalUnrealizedPnL)) * 100 : 0;
    
    const riskDistribution = {
      low: data.filter(item => item.risk === 'low').reduce((sum, item) => sum + item.allocation, 0),
      medium: data.filter(item => item.risk === 'medium').reduce((sum, item) => sum + item.allocation, 0),
      high: data.filter(item => item.risk === 'high').reduce((sum, item) => sum + item.allocation, 0),
    };

    const liquidityDistribution = {
      high: data.filter(item => item.liquidity === 'high').reduce((sum, item) => sum + item.allocation, 0),
      medium: data.filter(item => item.liquidity === 'medium').reduce((sum, item) => sum + item.allocation, 0),
      low: data.filter(item => item.liquidity === 'low').reduce((sum, item) => sum + item.allocation, 0),
    };

    return {
      totalDayChange,
      avgDayChangePercent,
      totalUnrealizedPnL,
      totalPnLPercent,
      assetCount: data.length,
      riskDistribution,
      liquidityDistribution,
    };
  }, [data, totalValue]);

  // Chart data for doughnut chart
  const doughnutData = useMemo(() => ({
    labels: groupedData.map(item => item.label),
    datasets: [
      {
        data: groupedData.map(item => item.allocation * 100),
        backgroundColor: groupedData.map((_, index) => COLORS[index % COLORS.length]),
        borderColor: theme.colors.background,
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    ],
  }), [groupedData, theme]);

  // Chart data for bar chart
  const barData = useMemo(() => ({
    labels: groupedData.map(item => item.label),
    datasets: [
      {
        label: 'Current Allocation (%)',
        data: groupedData.map(item => item.allocation * 100),
        backgroundColor: groupedData.map((_, index) => `${COLORS[index % COLORS.length]}80`),
        borderColor: groupedData.map((_, index) => COLORS[index % COLORS.length]),
        borderWidth: 1,
      },
      ...(showTargetAllocation ? [{
        label: 'Target Allocation (%)',
        data: groupedData.map(item => (item.targetAllocation || 0) * 100),
        backgroundColor: 'transparent',
        borderColor: theme.colors.muted,
        borderWidth: 2,
        type: 'line' as const,
        fill: false,
        tension: 0,
        pointRadius: 3,
      }] : []),
    ],
  }), [groupedData, showTargetAllocation, theme]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: selectedViewType !== 'table',
        position: 'bottom' as const,
        labels: {
          color: theme.colors.foreground,
          usePointStyle: true,
          padding: 20,
          generateLabels: (chart: any) => {
            const original = chart.legend.options.labels.generateLabels(chart);
            return original.map((label: any, index: number) => ({
              ...label,
              text: `${label.text} (${groupedData[index]?.allocation ? (groupedData[index].allocation * 100).toFixed(1) : '0'}%)`,
            }));
          },
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
            const item = groupedData[context.dataIndex];
            return [
              `${context.label}: ${context.parsed}%`,
              `Value: $${item.value.toLocaleString()}`,
              `Day Change: ${item.dayChange >= 0 ? '+' : ''}$${item.dayChange.toFixed(2)}`,
              `P&L: ${item.unrealizedPnL >= 0 ? '+' : ''}$${item.unrealizedPnL.toFixed(2)}`,
              ...(selectedGroupBy !== 'symbol' ? [`Assets: ${item.count}`] : []),
            ];
          },
        },
      },
    },
    scales: selectedViewType === 'bar' ? {
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
            return `${value}%`;
          },
        },
      },
    } : undefined,
  };

  React.useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Portfolio Allocation</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedGroupBy} onValueChange={setSelectedGroupBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_BY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              {(['doughnut', 'bar', 'table'] as const).map(type => (
                <Button
                  key={type}
                  variant={selectedViewType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedViewType(type)}
                  className="h-8 px-3 text-xs capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">
              ${totalValue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Value</div>
          </div>
          <div className="text-center">
            <div className={cn(
              'text-xl font-bold',
              stats.totalDayChange >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {stats.totalDayChange >= 0 ? '+' : ''}${stats.totalDayChange.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Day Change</div>
          </div>
          <div className="text-center">
            <div className={cn(
              'text-xl font-bold',
              stats.totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {stats.totalUnrealizedPnL >= 0 ? '+' : ''}${stats.totalUnrealizedPnL.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Total P&L</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">{stats.assetCount}</div>
            <div className="text-xs text-muted-foreground">Assets</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">{groupedData.length}</div>
            <div className="text-xs text-muted-foreground">Groups</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedViewType} onValueChange={setSelectedViewType}>
          <TabsContent value="doughnut" className="mt-4">
            <div style={{ height: `${height}px` }}>
              <Doughnut data={doughnutData} options={chartOptions} />
            </div>
          </TabsContent>

          <TabsContent value="bar" className="mt-4">
            <div style={{ height: `${height}px` }}>
              <Bar data={barData} options={chartOptions} />
            </div>
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            <div className="space-y-4">
              {/* Allocation Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{GROUP_BY_OPTIONS.find(o => o.value === selectedGroupBy)?.label}</th>
                      <th className="text-right p-2">Value</th>
                      <th className="text-right p-2">Allocation</th>
                      {showTargetAllocation && <th className="text-right p-2">Target</th>}
                      <th className="text-right p-2">Day Change</th>
                      <th className="text-right p-2">P&L</th>
                      {selectedGroupBy !== 'symbol' && <th className="text-center p-2">Assets</th>}
                      <th className="text-center p-2">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedData.map((item, index) => (
                      <tr key={item.label} className="border-b hover:bg-muted/20">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{item.label}</span>
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono">
                          ${item.value.toLocaleString()}
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono">{(item.allocation * 100).toFixed(1)}%</span>
                            <Progress 
                              value={item.allocation * 100} 
                              className="w-16 h-2"
                            />
                          </div>
                        </td>
                        {showTargetAllocation && (
                          <td className="p-2 text-right font-mono">
                            {item.targetAllocation ? `${(item.targetAllocation * 100).toFixed(1)}%` : '--'}
                          </td>
                        )}
                        <td className={cn(
                          'p-2 text-right font-mono',
                          item.dayChange >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {item.dayChange >= 0 ? '+' : ''}${item.dayChange.toFixed(2)}
                          <div className="text-xs text-muted-foreground">
                            ({item.dayChange >= 0 ? '+' : ''}{item.dayChangePercent.toFixed(2)}%)
                          </div>
                        </td>
                        <td className={cn(
                          'p-2 text-right font-mono',
                          item.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {item.unrealizedPnL >= 0 ? '+' : ''}${item.unrealizedPnL.toFixed(2)}
                        </td>
                        {selectedGroupBy !== 'symbol' && (
                          <td className="p-2 text-center">
                            <Badge variant="outline">{item.count}</Badge>
                          </td>
                        )}
                        <td className="p-2 text-center">
                          <Badge 
                            className={cn(
                              item.risk === 'low' ? 'bg-green-100 text-green-800' :
                              item.risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            )}
                          >
                            {item.risk}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Risk and Liquidity Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h4 className="text-sm font-medium mb-3">Risk Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.riskDistribution).map(([risk, allocation]) => (
                      <div key={risk} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={cn(
                              risk === 'low' ? 'bg-green-100 text-green-800' :
                              risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            )}
                          >
                            {risk}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={allocation * 100} className="w-20 h-2" />
                          <span className="text-sm font-mono w-12 text-right">
                            {(allocation * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Liquidity Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.liquidityDistribution).map(([liquidity, allocation]) => (
                      <div key={liquidity} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={cn(
                              liquidity === 'high' ? 'bg-blue-100 text-blue-800' :
                              liquidity === 'medium' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            )}
                          >
                            {liquidity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={allocation * 100} className="w-20 h-2" />
                          <span className="text-sm font-mono w-12 text-right">
                            {(allocation * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rebalancing Suggestions */}
              {enableRebalancing && showTargetAllocation && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Rebalancing Suggestions</h4>
                  {(() => {
                    const suggestions = groupedData
                      .filter(item => item.targetAllocation && Math.abs(item.allocation - item.targetAllocation) > 0.01)
                      .map(item => ({
                        ...item,
                        deviation: item.allocation - (item.targetAllocation || 0),
                        deviationAmount: (item.allocation - (item.targetAllocation || 0)) * totalValue,
                      }))
                      .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

                    return suggestions.length > 0 ? (
                      <div className="space-y-2">
                        {suggestions.slice(0, 5).map(suggestion => (
                          <div key={suggestion.label} className="flex items-center justify-between text-sm">
                            <span>{suggestion.label}</span>
                            <div className={cn(
                              'font-mono',
                              suggestion.deviation > 0 ? 'text-red-600' : 'text-green-600'
                            )}>
                              {suggestion.deviation > 0 ? 'Reduce by' : 'Increase by'} {Math.abs(suggestion.deviation * 100).toFixed(1)}%
                              <span className="text-muted-foreground ml-1">
                                (${Math.abs(suggestion.deviationAmount).toLocaleString()})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Portfolio is well balanced!</p>
                    );
                  })()}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Utility function to generate mock allocation data
export function generateMockAllocationData(count: number = 15): AllocationData[] {
  const symbols = ['BTC', 'ETH', 'AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'NFLX', 'SPY', 'QQQ', 'GLD', 'VTI', 'BND'];
  const sectors = ['Technology', 'Finance', 'Healthcare', 'Energy', 'Consumer', 'Crypto'];
  const assetClasses = ['Stocks', 'Crypto', 'ETFs', 'Bonds', 'Commodities'];
  const geographies = ['US', 'International', 'Emerging Markets', 'Global'];
  
  const allocations = Array.from({ length: count }, () => Math.random() * 0.15 + 0.01);
  const totalAllocation = allocations.reduce((sum, a) => sum + a, 0);
  
  return allocations.map((allocation, i) => {
    const normalizedAllocation = allocation / totalAllocation;
    const marketValue = normalizedAllocation * 1000000; // $1M portfolio
    const dayChangePercent = (Math.random() - 0.5) * 10; // ±5%
    const dayChange = marketValue * (dayChangePercent / 100);
    const unrealizedPnL = marketValue * ((Math.random() - 0.5) * 0.3); // ±15%
    
    return {
      symbol: symbols[i % symbols.length],
      name: `${symbols[i % symbols.length]} Company`,
      sector: sectors[Math.floor(Math.random() * sectors.length)],
      assetClass: assetClasses[Math.floor(Math.random() * assetClasses.length)],
      geography: geographies[Math.floor(Math.random() * geographies.length)],
      marketValue,
      allocation: normalizedAllocation,
      targetAllocation: normalizedAllocation * (0.8 + Math.random() * 0.4), // ±20% target
      cost: marketValue - unrealizedPnL,
      unrealizedPnL,
      dayChange,
      dayChangePercent,
      weight: normalizedAllocation,
      risk: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
      liquidity: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low',
    };
  });
}