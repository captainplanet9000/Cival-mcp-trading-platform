'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/lib/stores/app-store'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity, 
  Target,
  Settings
} from 'lucide-react'

export interface ChartControlsProps {
  symbol: string
  onSymbolChange?: (symbol: string) => void
  onTimeframeChange?: (timeframe: string) => void
  onIndicatorChange?: (indicators: string[]) => void
  onChartTypeChange?: (type: 'candlestick' | 'area' | 'line') => void
}

const POPULAR_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT',
  'SOLUSDT', 'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT'
]

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' }
]

const CHART_TYPES = [
  { label: 'Candlestick', value: 'candlestick', icon: BarChart3 },
  { label: 'Area', value: 'area', icon: TrendingUp },
  { label: 'Line', value: 'line', icon: Activity }
]

const TECHNICAL_INDICATORS = [
  { label: 'Moving Average (MA)', value: 'ma', color: 'blue' },
  { label: 'Bollinger Bands', value: 'bb', color: 'purple' },
  { label: 'RSI', value: 'rsi', color: 'orange' },
  { label: 'MACD', value: 'macd', color: 'green' },
  { label: 'Volume', value: 'volume', color: 'gray' },
  { label: 'Support/Resistance', value: 'sr', color: 'red' }
]

export function ChartControls({
  symbol,
  onSymbolChange,
  onTimeframeChange,
  onIndicatorChange,
  onChartTypeChange
}: ChartControlsProps) {
  const { chartState, updateChartState } = useAppStore()
  const [showIndicators, setShowIndicators] = useState(false)

  const handleSymbolChange = (newSymbol: string) => {
    updateChartState({ activeSymbol: newSymbol })
    onSymbolChange?.(newSymbol)
  }

  const handleTimeframeChange = (timeframe: string) => {
    updateChartState({ timeframe: timeframe as any })
    onTimeframeChange?.(timeframe)
  }

  const handleChartTypeChange = (chartType: string) => {
    updateChartState({ chartType: chartType as any })
    onChartTypeChange?.(chartType as any)
  }

  const handleIndicatorToggle = (indicator: string) => {
    const currentIndicators = chartState.indicators || []
    const newIndicators = currentIndicators.includes(indicator)
      ? currentIndicators.filter(i => i !== indicator)
      : [...currentIndicators, indicator]
    
    updateChartState({ indicators: newIndicators })
    onIndicatorChange?.(newIndicators)
  }

  const handleVolumeToggle = () => {
    updateChartState({ volume: !chartState.volume })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Symbol Selection */}
      <Select value={symbol} onValueChange={handleSymbolChange}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Symbol" />
        </SelectTrigger>
        <SelectContent>
          {POPULAR_SYMBOLS.map((sym) => (
            <SelectItem key={sym} value={sym}>
              {sym}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Timeframe Selection */}
      <div className="flex rounded-lg border bg-background">
        {TIMEFRAMES.map((tf) => (
          <Button
            key={tf.value}
            variant={chartState.timeframe === tf.value ? "default" : "ghost"}
            size="sm"
            className="rounded-none first:rounded-l-lg last:rounded-r-lg"
            onClick={() => handleTimeframeChange(tf.value)}
          >
            {tf.label}
          </Button>
        ))}
      </div>

      {/* Chart Type Selection */}
      <div className="flex rounded-lg border bg-background">
        {CHART_TYPES.map((type) => {
          const Icon = type.icon
          return (
            <Button
              key={type.value}
              variant={chartState.chartType === type.value ? "default" : "ghost"}
              size="sm"
              className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              onClick={() => handleChartTypeChange(type.value)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
      </div>

      {/* Volume Toggle */}
      <Button
        variant={chartState.volume ? "default" : "outline"}
        size="sm"
        onClick={handleVolumeToggle}
      >
        Volume
      </Button>

      {/* Indicators Toggle */}
      <Button
        variant={showIndicators ? "default" : "outline"}
        size="sm"
        onClick={() => setShowIndicators(!showIndicators)}
      >
        <Settings className="h-4 w-4 mr-1" />
        Indicators
      </Button>

      {/* Active Indicators Display */}
      {chartState.indicators && chartState.indicators.length > 0 && (
        <div className="flex gap-1">
          {chartState.indicators.map((indicator) => {
            const indicatorConfig = TECHNICAL_INDICATORS.find(i => i.value === indicator)
            return (
              <Badge 
                key={indicator} 
                variant="secondary"
                className="text-xs"
              >
                {indicatorConfig?.label || indicator}
              </Badge>
            )
          })}
        </div>
      )}

      {/* Indicators Panel */}
      {showIndicators && (
        <Card className="absolute top-full left-0 mt-2 w-80 z-50 shadow-lg">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Technical Indicators</h3>
            <div className="grid grid-cols-2 gap-2">
              {TECHNICAL_INDICATORS.map((indicator) => {
                const isActive = chartState.indicators?.includes(indicator.value) || false
                return (
                  <Button
                    key={indicator.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="justify-start text-left h-auto p-2"
                    onClick={() => handleIndicatorToggle(indicator.value)}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-2 h-2 rounded-full bg-${indicator.color}-500`}
                      />
                      <span className="text-xs">{indicator.label}</span>
                    </div>
                  </Button>
                )
              })}
            </div>
            
            <div className="mt-4 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  updateChartState({ indicators: [] })
                  onIndicatorChange?.([])
                }}
              >
                Clear All Indicators
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}