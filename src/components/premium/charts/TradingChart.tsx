'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Line, Candlestick, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TradingWebSocketClient } from '@/lib/websocket/websocket-client';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface CandlestickData {
  x: number;
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
}

interface VolumeData {
  x: number;
  y: number;
}

interface TechnicalIndicator {
  name: string;
  type: 'line' | 'histogram' | 'overlay';
  data: { x: number; y: number }[];
  color: string;
  visible: boolean;
}

interface MarketData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingChartProps {
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
  chartType: 'candlestick' | 'line' | 'area' | 'heikin_ashi';
  initialData?: MarketData[];
  wsClient?: TradingWebSocketClient;
  enableRealTimeUpdates?: boolean;
  enableTechnicalIndicators?: boolean;
  enableVolumeProfile?: boolean;
  enableOrderFlow?: boolean;
  height?: number;
  showToolbar?: boolean;
  onTimeframeChange?: (timeframe: string) => void;
  onChartTypeChange?: (chartType: string) => void;
  className?: string;
}

const TIMEFRAMES = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
  { value: '1w', label: '1w' },
];

const CHART_TYPES = [
  { value: 'candlestick', label: 'Candlestick' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'heikin_ashi', label: 'Heikin Ashi' },
];

const TECHNICAL_INDICATORS = [
  { name: 'SMA 20', type: 'line', color: '#3B82F6', period: 20 },
  { name: 'SMA 50', type: 'line', color: '#EF4444', period: 50 },
  { name: 'EMA 12', type: 'line', color: '#10B981', period: 12 },
  { name: 'EMA 26', type: 'line', color: '#F59E0B', period: 26 },
  { name: 'Bollinger Bands', type: 'line', color: '#8B5CF6', period: 20 },
  { name: 'RSI', type: 'histogram', color: '#EC4899', period: 14 },
  { name: 'MACD', type: 'histogram', color: '#06B6D4', period: [12, 26, 9] },
];

export function TradingChart({
  symbol,
  timeframe,
  chartType,
  initialData = [],
  wsClient,
  enableRealTimeUpdates = true,
  enableTechnicalIndicators = true,
  enableVolumeProfile = true,
  enableOrderFlow = false,
  height = 400,
  showToolbar = true,
  onTimeframeChange,
  onChartTypeChange,
  className,
}: TradingChartProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'TradingChart',
  });

  const chartRef = useRef<ChartJS>(null);
  const [marketData, setMarketData] = useState<MarketData[]>(initialData);
  const [indicators, setIndicators] = useState<TechnicalIndicator[]>([]);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['SMA 20', 'SMA 50']);
  const [showVolume, setShowVolume] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // WebSocket integration for real-time data
  useEffect(() => {
    if (!enableRealTimeUpdates || !wsClient) return;

    const unsubscribe = wsClient.on('kline_update', (message) => {
      const data = message.data;
      if (data.symbol !== symbol || data.timeframe !== timeframe) return;

      setMarketData(prevData => {
        const newCandle: MarketData = {
          timestamp: data.timestamp,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: data.volume,
        };

        const existingIndex = prevData.findIndex(candle => candle.timestamp === data.timestamp);
        
        if (existingIndex >= 0) {
          // Update existing candle
          const updated = [...prevData];
          updated[existingIndex] = newCandle;
          return updated;
        } else {
          // Add new candle
          return [...prevData, newCandle].slice(-500); // Keep last 500 candles
        }
      });

      setLastUpdate(new Date());
    });

    // Subscribe to market data
    wsClient.send('subscribe_kline', { symbol, timeframe });

    return () => {
      unsubscribe();
      wsClient.send('unsubscribe_kline', { symbol, timeframe });
    };
  }, [wsClient, enableRealTimeUpdates, symbol, timeframe]);

  // Performance monitoring
  useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Calculate technical indicators
  const calculateIndicators = useMemo(() => {
    if (!enableTechnicalIndicators || marketData.length === 0) return [];

    const calculatedIndicators: TechnicalIndicator[] = [];

    activeIndicators.forEach(indicatorName => {
      const indicator = TECHNICAL_INDICATORS.find(ind => ind.name === indicatorName);
      if (!indicator) return;

      let data: { x: number; y: number }[] = [];

      switch (indicatorName) {
        case 'SMA 20':
        case 'SMA 50':
          const period = parseInt(indicatorName.split(' ')[1]);
          data = calculateSMA(marketData, period);
          break;
        case 'EMA 12':
        case 'EMA 26':
          const emaPeriod = parseInt(indicatorName.split(' ')[1]);
          data = calculateEMA(marketData, emaPeriod);
          break;
        case 'RSI':
          data = calculateRSI(marketData, 14);
          break;
        case 'MACD':
          data = calculateMACD(marketData);
          break;
        case 'Bollinger Bands':
          data = calculateBollingerBands(marketData, 20);
          break;
      }

      if (data.length > 0) {
        calculatedIndicators.push({
          name: indicatorName,
          type: indicator.type as 'line' | 'histogram' | 'overlay',
          data,
          color: indicator.color,
          visible: true,
        });
      }
    });

    return calculatedIndicators;
  }, [marketData, activeIndicators, enableTechnicalIndicators]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (marketData.length === 0) return null;

    const datasets: any[] = [];

    // Main price data
    if (chartType === 'candlestick' || chartType === 'heikin_ashi') {
      const candleData: CandlestickData[] = marketData.map(candle => ({
        x: candle.timestamp,
        o: candle.open,
        h: candle.high,
        l: candle.low,
        c: candle.close,
      }));

      datasets.push({
        label: symbol,
        data: candleData,
        type: 'candlestick' as const,
        borderColor: theme.colors.profit,
        backgroundColor: theme.colors.loss,
      });
    } else if (chartType === 'line') {
      datasets.push({
        label: symbol,
        data: marketData.map(candle => ({
          x: candle.timestamp,
          y: candle.close,
        })),
        borderColor: theme.colors.primary,
        backgroundColor: 'transparent',
        tension: 0.1,
      });
    } else if (chartType === 'area') {
      datasets.push({
        label: symbol,
        data: marketData.map(candle => ({
          x: candle.timestamp,
          y: candle.close,
        })),
        borderColor: theme.colors.primary,
        backgroundColor: `${theme.colors.primary}20`,
        fill: true,
        tension: 0.1,
      });
    }

    // Add technical indicators
    calculatedIndicators.forEach(indicator => {
      if (indicator.visible && indicator.type === 'line') {
        datasets.push({
          label: indicator.name,
          data: indicator.data,
          borderColor: indicator.color,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1,
        });
      }
    });

    // Volume data (if enabled)
    if (showVolume) {
      datasets.push({
        label: 'Volume',
        data: marketData.map(candle => ({
          x: candle.timestamp,
          y: candle.volume,
        })),
        type: 'bar' as const,
        backgroundColor: `${theme.colors.muted}40`,
        borderColor: theme.colors.muted,
        borderWidth: 1,
        yAxisID: 'volume',
      });
    }

    return {
      datasets,
    };
  }, [marketData, chartType, calculatedIndicators, showVolume, theme, symbol]);

  // Chart options
  const chartOptions: ChartOptions = useMemo(() => ({
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
          filter: (legendItem) => legendItem.text !== 'Volume',
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
          title: (context) => {
            return new Date(context[0].parsed.x).toLocaleString();
          },
          label: (context: TooltipItem<any>) => {
            if (context.dataset.label === 'Volume') {
              return `Volume: ${Number(context.parsed.y).toLocaleString()}`;
            }
            if (context.dataset.type === 'candlestick') {
              const data = context.raw as CandlestickData;
              return [
                `Open: $${data.o.toFixed(2)}`,
                `High: $${data.h.toFixed(2)}`,
                `Low: $${data.l.toFixed(2)}`,
                `Close: $${data.c.toFixed(2)}`,
              ];
            }
            return `${context.dataset.label}: $${Number(context.parsed.y).toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
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
        position: 'right' as const,
        grid: {
          color: `${theme.colors.border}40`,
        },
        ticks: {
          color: theme.colors.mutedForeground,
          callback: function(value) {
            return `$${Number(value).toFixed(2)}`;
          },
        },
      },
      volume: {
        type: 'linear' as const,
        display: showVolume,
        position: 'left' as const,
        max: showVolume ? undefined : 0,
        grid: {
          display: false,
        },
        ticks: {
          color: theme.colors.mutedForeground,
          callback: function(value) {
            return Number(value).toLocaleString();
          },
        },
      },
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 4,
      },
    },
  }), [theme, showVolume]);

  // Toggle indicator
  const toggleIndicator = (indicatorName: string) => {
    setActiveIndicators(prev => 
      prev.includes(indicatorName)
        ? prev.filter(name => name !== indicatorName)
        : [...prev, indicatorName]
    );
  };

  if (!chartData) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-muted border-t-foreground rounded-full animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      {showToolbar && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>{symbol}</span>
              <Badge variant="outline">{timeframe}</Badge>
              {lastUpdate && (
                <Badge variant="secondary" className="text-xs">
                  {lastUpdate.toLocaleTimeString()}
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* Timeframe selector */}
              <Select value={timeframe} onValueChange={onTimeframeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Chart type selector */}
              <Select value={chartType} onValueChange={onChartTypeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map(ct => (
                    <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Volume toggle */}
              <div className="flex items-center gap-1">
                <Switch
                  id="volume"
                  checked={showVolume}
                  onCheckedChange={setShowVolume}
                  size="sm"
                />
                <Label htmlFor="volume" className="text-xs">Volume</Label>
              </div>
            </div>
          </div>

          {/* Technical indicators */}
          {enableTechnicalIndicators && (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              <span className="text-xs text-muted-foreground mr-2">Indicators:</span>
              {TECHNICAL_INDICATORS.map(indicator => (
                <Button
                  key={indicator.name}
                  variant={activeIndicators.includes(indicator.name) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleIndicator(indicator.name)}
                  className="h-6 px-2 text-xs"
                  style={{
                    borderColor: activeIndicators.includes(indicator.name) ? indicator.color : undefined,
                    color: activeIndicators.includes(indicator.name) ? undefined : indicator.color,
                  }}
                >
                  {indicator.name}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
      )}

      <CardContent>
        <div style={{ height: `${height}px` }}>
          <Line
            ref={chartRef}
            data={chartData}
            options={chartOptions}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Technical indicator calculation functions
function calculateSMA(data: MarketData[], period: number): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
    result.push({
      x: data[i].timestamp,
      y: sum / period,
    });
  }
  
  return result;
}

function calculateEMA(data: MarketData[], period: number): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  const multiplier = 2 / (period + 1);
  
  if (data.length === 0) return result;
  
  // Start with SMA for first value
  let ema = data.slice(0, period).reduce((acc, candle) => acc + candle.close, 0) / period;
  result.push({ x: data[period - 1].timestamp, y: ema });
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({
      x: data[i].timestamp,
      y: ema,
    });
  }
  
  return result;
}

function calculateRSI(data: MarketData[], period: number): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  
  if (data.length < period + 1) return result;
  
  for (let i = period; i < data.length; i++) {
    let gains = 0;
    let losses = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const change = data[j].close - data[j - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    result.push({
      x: data[i].timestamp,
      y: rsi,
    });
  }
  
  return result;
}

function calculateMACD(data: MarketData[]): { x: number; y: number }[] {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const result: { x: number; y: number }[] = [];
  
  const minLength = Math.min(ema12.length, ema26.length);
  for (let i = 0; i < minLength; i++) {
    if (ema12[i].x === ema26[i].x) {
      result.push({
        x: ema12[i].x,
        y: ema12[i].y - ema26[i].y,
      });
    }
  }
  
  return result;
}

function calculateBollingerBands(data: MarketData[], period: number): { x: number; y: number }[] {
  const sma = calculateSMA(data, period);
  const result: { x: number; y: number }[] = [];
  
  for (let i = 0; i < sma.length; i++) {
    const dataIndex = i + period - 1;
    const prices = data.slice(dataIndex - period + 1, dataIndex + 1).map(candle => candle.close);
    const mean = sma[i].y;
    const variance = prices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    // Return middle band (SMA) for simplicity
    result.push({
      x: sma[i].x,
      y: mean,
    });
  }
  
  return result;
}