'use client';

import React, { useState, useMemo } from 'react';
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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface RiskMetric {
  symbol: string;
  sector?: string;
  marketCap?: number;
  volatility: number;
  beta: number;
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  expectedShortfall: number;
  correlation: number;
  concentrationRisk: number;
  liquidityRisk: number;
  creditRisk?: number;
  position: number;
  allocation: number;
  riskContribution: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface RiskHeatmapProps {
  data: RiskMetric[];
  metric?: 'volatility' | 'var95' | 'var99' | 'beta' | 'correlation' | 'concentration' | 'liquidity' | 'risk_contribution' | 'sharpe_ratio' | 'max_drawdown';
  groupBy?: 'sector' | 'market_cap' | 'allocation' | 'none';
  showValues?: boolean;
  enableTooltips?: boolean;
  height?: number;
  className?: string;
}

const RISK_METRICS = [
  { value: 'volatility', label: 'Volatility', format: (v: number) => `${(v * 100).toFixed(1)}%`, color: 'red' },
  { value: 'var95', label: 'VaR 95%', format: (v: number) => `${(v * 100).toFixed(1)}%`, color: 'red' },
  { value: 'var99', label: 'VaR 99%', format: (v: number) => `${(v * 100).toFixed(1)}%`, color: 'red' },
  { value: 'beta', label: 'Beta', format: (v: number) => v.toFixed(2), color: 'blue' },
  { value: 'correlation', label: 'Correlation', format: (v: number) => v.toFixed(2), color: 'purple' },
  { value: 'concentration', label: 'Concentration Risk', format: (v: number) => `${(v * 100).toFixed(1)}%`, color: 'orange' },
  { value: 'liquidity', label: 'Liquidity Risk', format: (v: number) => v.toFixed(2), color: 'yellow' },
  { value: 'risk_contribution', label: 'Risk Contribution', format: (v: number) => `${(v * 100).toFixed(1)}%`, color: 'red' },
  { value: 'sharpe_ratio', label: 'Sharpe Ratio', format: (v: number) => v.toFixed(2), color: 'green', inverse: true },
  { value: 'max_drawdown', label: 'Max Drawdown', format: (v: number) => `${(v * 100).toFixed(1)}%`, color: 'red' },
];

const SECTORS = ['Technology', 'Finance', 'Healthcare', 'Energy', 'Consumer', 'Industrial', 'Materials', 'Utilities', 'Real Estate', 'Crypto'];
const MARKET_CAP_RANGES = ['Micro Cap', 'Small Cap', 'Mid Cap', 'Large Cap', 'Mega Cap'];

export function RiskHeatmap({
  data,
  metric = 'volatility',
  groupBy = 'none',
  showValues = true,
  enableTooltips = true,
  height = 400,
  className,
}: RiskHeatmapProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'RiskHeatmap',
  });

  const [selectedMetric, setSelectedMetric] = useState(metric);
  const [selectedGroupBy, setSelectedGroupBy] = useState(groupBy);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Get current metric configuration
  const currentMetric = RISK_METRICS.find(m => m.value === selectedMetric);

  // Group and sort data
  const groupedData = useMemo(() => {
    if (selectedGroupBy === 'none') {
      return [{ name: 'All Assets', items: [...data].sort((a, b) => b.allocation - a.allocation) }];
    }

    const groups: { [key: string]: RiskMetric[] } = {};

    data.forEach(item => {
      let groupKey = 'Unknown';
      
      switch (selectedGroupBy) {
        case 'sector':
          groupKey = item.sector || 'Unknown';
          break;
        case 'market_cap':
          if (item.marketCap) {
            if (item.marketCap < 300e6) groupKey = 'Micro Cap';
            else if (item.marketCap < 2e9) groupKey = 'Small Cap';
            else if (item.marketCap < 10e9) groupKey = 'Mid Cap';
            else if (item.marketCap < 200e9) groupKey = 'Large Cap';
            else groupKey = 'Mega Cap';
          }
          break;
        case 'allocation':
          if (item.allocation < 0.02) groupKey = '< 2%';
          else if (item.allocation < 0.05) groupKey = '2-5%';
          else if (item.allocation < 0.1) groupKey = '5-10%';
          else if (item.allocation < 0.2) groupKey = '10-20%';
          else groupKey = '> 20%';
          break;
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });

    // Sort groups and items within groups
    return Object.entries(groups)
      .map(([name, items]) => ({
        name,
        items: items.sort((a, b) => b.allocation - a.allocation),
      }))
      .sort((a, b) => {
        const aTotal = a.items.reduce((sum, item) => sum + item.allocation, 0);
        const bTotal = b.items.reduce((sum, item) => sum + item.allocation, 0);
        return bTotal - aTotal;
      });
  }, [data, selectedGroupBy]);

  // Calculate min/max values for color scaling
  const { minValue, maxValue } = useMemo(() => {
    const metricValues = data.map(item => {
      switch (selectedMetric) {
        case 'volatility': return item.volatility;
        case 'var95': return item.var95;
        case 'var99': return item.var99;
        case 'beta': return item.beta;
        case 'correlation': return Math.abs(item.correlation);
        case 'concentration': return item.concentrationRisk;
        case 'liquidity': return item.liquidityRisk;
        case 'risk_contribution': return item.riskContribution;
        case 'sharpe_ratio': return item.sharpeRatio;
        case 'max_drawdown': return item.maxDrawdown;
        default: return 0;
      }
    });

    return {
      minValue: Math.min(...metricValues),
      maxValue: Math.max(...metricValues),
    };
  }, [data, selectedMetric]);

  // Get color for value
  const getColor = (value: number) => {
    if (maxValue === minValue) return 'rgba(156, 163, 175, 0.3)'; // neutral gray
    
    const normalizedValue = (value - minValue) / (maxValue - minValue);
    const intensity = currentMetric?.inverse ? 1 - normalizedValue : normalizedValue;
    
    const colors = {
      red: `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`,
      green: `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`,
      blue: `rgba(59, 130, 246, ${0.2 + intensity * 0.6})`,
      purple: `rgba(168, 85, 247, ${0.2 + intensity * 0.6})`,
      orange: `rgba(249, 115, 22, ${0.2 + intensity * 0.6})`,
      yellow: `rgba(234, 179, 8, ${0.2 + intensity * 0.6})`,
    };

    return colors[currentMetric?.color as keyof typeof colors] || colors.red;
  };

  // Get value for metric
  const getValue = (item: RiskMetric) => {
    switch (selectedMetric) {
      case 'volatility': return item.volatility;
      case 'var95': return item.var95;
      case 'var99': return item.var99;
      case 'beta': return item.beta;
      case 'correlation': return item.correlation;
      case 'concentration': return item.concentrationRisk;
      case 'liquidity': return item.liquidityRisk;
      case 'risk_contribution': return item.riskContribution;
      case 'sharpe_ratio': return item.sharpeRatio;
      case 'max_drawdown': return item.maxDrawdown;
      default: return 0;
    }
  };

  // Calculate grid dimensions
  const maxItemsPerRow = Math.max(...groupedData.map(group => group.items.length));
  const cellSize = Math.max(40, Math.min(80, (height - 200) / groupedData.length));

  React.useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  if (data.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No risk data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>Risk Heatmap</span>
            <Badge variant="outline">{currentMetric?.label}</Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RISK_METRICS.map(metric => (
                  <SelectItem key={metric.value} value={metric.value}>
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedGroupBy} onValueChange={setSelectedGroupBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="sector">By Sector</SelectItem>
                <SelectItem value="market_cap">By Market Cap</SelectItem>
                <SelectItem value="allocation">By Allocation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Risk Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {currentMetric?.format(data.reduce((sum, item) => sum + getValue(item) * item.allocation, 0))}
            </div>
            <div className="text-xs text-muted-foreground">Portfolio Weighted</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {currentMetric?.format(maxValue)}
            </div>
            <div className="text-xs text-muted-foreground">Maximum</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {currentMetric?.format(minValue)}
            </div>
            <div className="text-xs text-muted-foreground">Minimum</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {data.length}
            </div>
            <div className="text-xs text-muted-foreground">Assets</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <TooltipProvider>
          <div className="space-y-4">
            {/* Color scale legend */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk Level:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {currentMetric?.inverse ? 'High' : 'Low'}
                </span>
                <div className="flex h-4 w-32 rounded">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div
                      key={i}
                      className="flex-1 h-full"
                      style={{
                        backgroundColor: getColor(minValue + (i / 19) * (maxValue - minValue)),
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {currentMetric?.inverse ? 'Low' : 'High'}
                </span>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="space-y-6">
              {groupedData.map(group => (
                <div key={group.name} className="space-y-2">
                  {selectedGroupBy !== 'none' && (
                    <h4 className="text-sm font-medium text-foreground">{group.name}</h4>
                  )}
                  
                  <div className="grid gap-1" style={{
                    gridTemplateColumns: `repeat(${Math.min(group.items.length, Math.floor((window.innerWidth - 100) / (cellSize + 4)))}, ${cellSize}px)`,
                  }}>
                    {group.items.map(item => {
                      const value = getValue(item);
                      const cellId = `${group.name}-${item.symbol}`;
                      
                      return (
                        <Tooltip key={item.symbol} delayDuration={enableTooltips ? 300 : 999999}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'relative rounded border cursor-pointer transition-all',
                                'hover:ring-2 hover:ring-primary hover:z-10',
                                hoveredCell === cellId && 'ring-2 ring-primary z-10'
                              )}
                              style={{
                                height: `${cellSize}px`,
                                backgroundColor: getColor(value),
                                borderColor: theme.colors.border,
                              }}
                              onMouseEnter={() => setHoveredCell(cellId)}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {/* Symbol */}
                              <div className="absolute top-1 left-1 text-xs font-medium text-foreground">
                                {item.symbol}
                              </div>
                              
                              {/* Allocation percentage */}
                              <div className="absolute top-1 right-1 text-xs text-muted-foreground">
                                {(item.allocation * 100).toFixed(1)}%
                              </div>
                              
                              {/* Value */}
                              {showValues && (
                                <div className="absolute bottom-1 left-1 text-xs font-mono text-foreground">
                                  {currentMetric?.format(value)}
                                </div>
                              )}

                              {/* Risk indicator dot */}
                              <div
                                className="absolute bottom-1 right-1 w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: value > (minValue + maxValue) / 2 
                                    ? (currentMetric?.inverse ? theme.colors.profit : theme.colors.loss)
                                    : (currentMetric?.inverse ? theme.colors.loss : theme.colors.profit),
                                }}
                              />
                            </div>
                          </TooltipTrigger>
                          
                          {enableTooltips && (
                            <TooltipContent side="top" className="p-3">
                              <div className="space-y-2">
                                <div className="font-medium">{item.symbol}</div>
                                {item.sector && (
                                  <div className="text-xs text-muted-foreground">
                                    Sector: {item.sector}
                                  </div>
                                )}
                                <div className="text-xs">
                                  <div className="grid grid-cols-2 gap-2">
                                    <span>Allocation:</span>
                                    <span>{(item.allocation * 100).toFixed(1)}%</span>
                                    <span>Position:</span>
                                    <span>${item.position.toLocaleString()}</span>
                                    <span>{currentMetric?.label}:</span>
                                    <span>{currentMetric?.format(value)}</span>
                                    <span>Risk Contrib:</span>
                                    <span>{(item.riskContribution * 100).toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* High Risk Assets Alert */}
            {(() => {
              const highRiskAssets = data.filter(item => {
                const value = getValue(item);
                const threshold = minValue + (maxValue - minValue) * 0.8;
                return currentMetric?.inverse ? value < threshold : value > threshold;
              });

              return highRiskAssets.length > 0 && (
                <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    High Risk Assets ({highRiskAssets.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {highRiskAssets.slice(0, 10).map(asset => (
                      <Badge key={asset.symbol} variant="destructive" className="text-xs">
                        {asset.symbol} ({currentMetric?.format(getValue(asset))})
                      </Badge>
                    ))}
                    {highRiskAssets.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{highRiskAssets.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

// Utility function to generate mock risk data
export function generateMockRiskData(count: number = 20): RiskMetric[] {
  const symbols = ['BTC', 'ETH', 'AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'NFLX', 'SPY', 'QQQ', 'GLD', 'VTI', 'BND', 'TLT', 'IWM', 'EEM', 'VEA', 'AGG'];
  
  return Array.from({ length: Math.min(count, symbols.length) }, (_, i) => {
    const allocation = Math.random() * 0.2 + 0.01; // 1-21%
    const volatility = Math.random() * 0.4 + 0.1; // 10-50%
    
    return {
      symbol: symbols[i],
      sector: SECTORS[Math.floor(Math.random() * SECTORS.length)],
      marketCap: Math.random() * 1000e9,
      volatility,
      beta: Math.random() * 2 + 0.5,
      var95: volatility * 1.65, // Approximation
      var99: volatility * 2.33, // Approximation
      expectedShortfall: volatility * 2.5,
      correlation: Math.random() * 2 - 1, // -1 to 1
      concentrationRisk: allocation,
      liquidityRisk: Math.random() * 5,
      position: allocation * 1000000, // $1M portfolio
      allocation,
      riskContribution: allocation * volatility,
      sharpeRatio: Math.random() * 2,
      maxDrawdown: Math.random() * 0.3,
    };
  });
}