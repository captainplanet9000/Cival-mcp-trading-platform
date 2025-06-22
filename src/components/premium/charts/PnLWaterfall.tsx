'use client';

import React, { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
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

interface PnLComponent {
  label: string;
  value: number;
  type: 'starting' | 'positive' | 'negative' | 'ending' | 'subtotal';
  category?: 'trading' | 'fees' | 'dividends' | 'fx' | 'other';
  description?: string;
  breakdown?: {
    symbol?: string;
    quantity?: number;
    price?: number;
    fees?: number;
  };
}

interface PnLWaterfallProps {
  data: PnLComponent[];
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  currency?: string;
  showBreakdown?: boolean;
  enableDrillDown?: boolean;
  height?: number;
  onComponentClick?: (component: PnLComponent) => void;
  className?: string;
}

const PERIOD_LABELS = {
  daily: 'Daily P&L',
  weekly: 'Weekly P&L', 
  monthly: 'Monthly P&L',
  quarterly: 'Quarterly P&L',
  yearly: 'Annual P&L',
  custom: 'Custom Period P&L',
};

export function PnLWaterfall({
  data,
  period,
  currency = 'USD',
  showBreakdown = true,
  enableDrillDown = true,
  height = 400,
  onComponentClick,
  className,
}: PnLWaterfallProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'PnLWaterfall',
  });

  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selectedComponent, setSelectedComponent] = useState<PnLComponent | null>(null);

  // Calculate cumulative values for waterfall chart
  const waterfallData = useMemo(() => {
    let cumulative = 0;
    const chartData: {
      label: string;
      value: number;
      cumulative: number;
      type: PnLComponent['type'];
      component: PnLComponent;
      color: string;
      base: number;
    }[] = [];

    data.forEach((component, index) => {
      let color: string;
      let base = 0;

      switch (component.type) {
        case 'starting':
          cumulative = component.value;
          color = theme.colors.muted;
          base = 0;
          break;
        case 'ending':
          color = cumulative >= 0 ? theme.colors.profit : theme.colors.loss;
          base = 0;
          break;
        case 'subtotal':
          color = theme.colors.primary;
          base = 0;
          break;
        case 'positive':
          color = theme.colors.profit;
          base = cumulative;
          cumulative += component.value;
          break;
        case 'negative':
          color = theme.colors.loss;
          base = cumulative + component.value;
          cumulative += component.value;
          break;
        default:
          color = component.value >= 0 ? theme.colors.profit : theme.colors.loss;
          if (component.value >= 0) {
            base = cumulative;
            cumulative += component.value;
          } else {
            base = cumulative + component.value;
            cumulative += component.value;
          }
      }

      chartData.push({
        label: component.label,
        value: component.value,
        cumulative,
        type: component.type,
        component,
        color,
        base,
      });
    });

    return chartData;
  }, [data, theme]);

  // Chart data for Chart.js
  const chartData = useMemo(() => {
    return {
      labels: waterfallData.map(item => item.label),
      datasets: [
        {
          label: 'P&L Components',
          data: waterfallData.map(item => {
            if (item.type === 'starting' || item.type === 'ending' || item.type === 'subtotal') {
              return item.cumulative;
            }
            return Math.abs(item.value);
          }),
          backgroundColor: waterfallData.map(item => item.color),
          borderColor: waterfallData.map(item => item.color),
          borderWidth: 1,
          // For waterfall effect, we need to use base values
          base: waterfallData.map(item => {
            if (item.type === 'starting' || item.type === 'ending' || item.type === 'subtotal') {
              return 0;
            }
            return item.base;
          }),
        },
      ],
    };
  }, [waterfallData]);

  // Chart options
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: true,
    },
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
        callbacks: {
          title: (context: any) => {
            return context[0].label;
          },
          label: (context: any) => {
            const item = waterfallData[context.dataIndex];
            const lines = [
              `Amount: ${currency} ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            ];
            
            if (item.type !== 'starting' && item.type !== 'ending') {
              lines.push(`Running Total: ${currency} ${item.cumulative.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
            }
            
            if (item.component.description) {
              lines.push(`${item.component.description}`);
            }
            
            if (item.component.breakdown) {
              const breakdown = item.component.breakdown;
              if (breakdown.symbol) lines.push(`Symbol: ${breakdown.symbol}`);
              if (breakdown.quantity) lines.push(`Quantity: ${breakdown.quantity}`);
              if (breakdown.price) lines.push(`Price: ${currency} ${breakdown.price}`);
              if (breakdown.fees) lines.push(`Fees: ${currency} ${breakdown.fees}`);
            }
            
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
          maxRotation: 45,
        },
      },
      y: {
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
          callback: function(value: any) {
            return `${currency} ${Number(value).toLocaleString()}`;
          },
        },
        title: {
          display: true,
          text: `Amount (${currency})`,
          color: theme.colors.foreground,
        },
      },
    },
    onClick: (event: any, elements: any) => {
      if (elements.length > 0 && enableDrillDown) {
        const index = elements[0].index;
        const component = waterfallData[index]?.component;
        if (component) {
          setSelectedComponent(component);
          onComponentClick?.(component);
        }
      }
    },
  }), [waterfallData, theme, currency, enableDrillDown, onComponentClick]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const starting = data.find(item => item.type === 'starting')?.value || 0;
    const ending = data.find(item => item.type === 'ending')?.value || waterfallData[waterfallData.length - 1]?.cumulative || 0;
    const totalGains = data.filter(item => item.value > 0 && item.type !== 'starting' && item.type !== 'ending').reduce((sum, item) => sum + item.value, 0);
    const totalLosses = data.filter(item => item.value < 0).reduce((sum, item) => sum + Math.abs(item.value), 0);
    const netChange = ending - starting;
    const netChangePercent = starting !== 0 ? (netChange / starting) * 100 : 0;

    // Category breakdown
    const categoryBreakdown: { [key: string]: number } = {};
    data.forEach(item => {
      if (item.category && item.type !== 'starting' && item.type !== 'ending') {
        categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + item.value;
      }
    });

    return {
      starting,
      ending,
      totalGains,
      totalLosses,
      netChange,
      netChangePercent,
      categoryBreakdown,
    };
  }, [data, waterfallData]);

  React.useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>{PERIOD_LABELS[selectedPeriod]}</span>
            <Badge 
              variant={summary.netChange >= 0 ? 'default' : 'destructive'}
              className={cn(
                summary.netChange >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              )}
            >
              {summary.netChange >= 0 ? '+' : ''}{currency} {summary.netChange.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Badge>
          </CardTitle>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {currency} {summary.starting.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">Starting Value</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              +{currency} {summary.totalGains.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">Total Gains</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">
              -{currency} {summary.totalLosses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">Total Losses</div>
          </div>
          <div className="text-center">
            <div className={cn(
              'text-lg font-bold',
              summary.netChange >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {summary.netChange >= 0 ? '+' : ''}{currency} {summary.netChange.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">Net Change</div>
          </div>
          <div className="text-center">
            <div className={cn(
              'text-lg font-bold',
              summary.netChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {summary.netChangePercent >= 0 ? '+' : ''}{summary.netChangePercent.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">Return</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {currency} {summary.ending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">Ending Value</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="waterfall">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="waterfall">Waterfall Chart</TabsTrigger>
            <TabsTrigger value="breakdown">Category Breakdown</TabsTrigger>
            <TabsTrigger value="details">Detailed View</TabsTrigger>
          </TabsList>

          <TabsContent value="waterfall" className="mt-4">
            <div style={{ height: `${height}px` }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="mt-4">
            <div className="space-y-4">
              {/* Category Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(summary.categoryBreakdown).map(([category, value]) => (
                  <div key={category} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium capitalize">{category}</h4>
                      <Badge 
                        variant={value >= 0 ? 'default' : 'destructive'}
                        className={cn(
                          value >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        )}
                      >
                        {value >= 0 ? '+' : ''}{currency} {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Badge>
                    </div>
                    
                    {/* Components in this category */}
                    <div className="space-y-1">
                      {data
                        .filter(item => item.category === category)
                        .map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className={cn(
                              'font-mono',
                              item.value >= 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              {item.value >= 0 ? '+' : ''}{currency} {item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <div className="space-y-4">
              {/* Detailed Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Component</th>
                      <th className="text-center p-2">Type</th>
                      <th className="text-center p-2">Category</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-right p-2">Running Total</th>
                      <th className="text-left p-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waterfallData.map((item, index) => (
                      <tr 
                        key={index} 
                        className={cn(
                          'border-b hover:bg-muted/20',
                          enableDrillDown && 'cursor-pointer',
                          selectedComponent === item.component && 'bg-muted/30'
                        )}
                        onClick={() => {
                          if (enableDrillDown) {
                            setSelectedComponent(item.component);
                            onComponentClick?.(item.component);
                          }
                        }}
                      >
                        <td className="p-2 font-medium">{item.label}</td>
                        <td className="p-2 text-center">
                          <Badge variant="outline" className="capitalize">
                            {item.type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          {item.component.category && (
                            <Badge variant="secondary" className="capitalize">
                              {item.component.category}
                            </Badge>
                          )}
                        </td>
                        <td className={cn(
                          'p-2 text-right font-mono',
                          item.value >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {item.type === 'starting' || item.type === 'ending' ? '' : 
                            `${item.value >= 0 ? '+' : ''}${currency} ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          }
                        </td>
                        <td className="p-2 text-right font-mono text-foreground">
                          {currency} {item.cumulative.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-muted-foreground text-xs">
                          {item.component.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Selected Component Details */}
              {selectedComponent && selectedComponent.breakdown && (
                <div className="p-4 border rounded-lg bg-muted/20">
                  <h4 className="font-medium mb-2">{selectedComponent.label} - Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {selectedComponent.breakdown.symbol && (
                      <div>
                        <span className="text-muted-foreground">Symbol:</span>
                        <span className="ml-2 font-medium">{selectedComponent.breakdown.symbol}</span>
                      </div>
                    )}
                    {selectedComponent.breakdown.quantity && (
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="ml-2 font-mono">{selectedComponent.breakdown.quantity}</span>
                      </div>
                    )}
                    {selectedComponent.breakdown.price && (
                      <div>
                        <span className="text-muted-foreground">Price:</span>
                        <span className="ml-2 font-mono">{currency} {selectedComponent.breakdown.price}</span>
                      </div>
                    )}
                    {selectedComponent.breakdown.fees && (
                      <div>
                        <span className="text-muted-foreground">Fees:</span>
                        <span className="ml-2 font-mono">{currency} {selectedComponent.breakdown.fees}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Utility function to generate mock P&L waterfall data
export function generateMockPnLData(period: 'daily' | 'weekly' | 'monthly' = 'daily'): PnLComponent[] {
  const baseValue = 100000;
  
  return [
    {
      label: 'Starting Balance',
      value: baseValue,
      type: 'starting',
      description: 'Portfolio value at period start',
    },
    {
      label: 'AAPL Trading',
      value: 2450,
      type: 'positive',
      category: 'trading',
      description: 'Realized gains from AAPL position',
      breakdown: {
        symbol: 'AAPL',
        quantity: 100,
        price: 24.50,
        fees: 5,
      },
    },
    {
      label: 'BTC Trading',
      value: -1200,
      type: 'negative',
      category: 'trading',
      description: 'Realized losses from BTC position',
      breakdown: {
        symbol: 'BTC',
        quantity: 0.05,
        price: -24000,
        fees: 8,
      },
    },
    {
      label: 'Trading Fees',
      value: -85,
      type: 'negative',
      category: 'fees',
      description: 'Commission and trading fees',
    },
    {
      label: 'Dividend Income',
      value: 340,
      type: 'positive',
      category: 'dividends',
      description: 'Dividend payments received',
    },
    {
      label: 'FX Impact',
      value: -75,
      type: 'negative',
      category: 'fx',
      description: 'Foreign exchange impact',
    },
    {
      label: 'Mark-to-Market',
      value: 1890,
      type: 'positive',
      category: 'trading',
      description: 'Unrealized gains on open positions',
    },
    {
      label: 'Ending Balance',
      value: baseValue + 2450 - 1200 - 85 + 340 - 75 + 1890,
      type: 'ending',
      description: 'Portfolio value at period end',
    },
  ];
}