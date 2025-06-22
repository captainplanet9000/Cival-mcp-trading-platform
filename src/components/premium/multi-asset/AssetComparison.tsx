'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  ScaleIcon,
  ChartBarIcon,
  BeakerIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
  MinusIcon,
  ArrowsUpDownIcon,
  StarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Radar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Asset {
  id: string
  symbol: string
  name: string
  type: 'stock' | 'etf' | 'bond' | 'commodity' | 'crypto' | 'currency' | 'reit'
  sector?: string
  region: string
  currency: string
  price: number
  marketCap?: number
  volume: number
  metrics: {
    return1d: number
    return1w: number
    return1m: number
    return3m: number
    return6m: number
    return1y: number
    return3y: number
    returnYtd: number
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
    beta: number
    alpha: number
    correlation: number
    dividendYield?: number
    peRatio?: number
    pbRatio?: number
    roe?: number
    expenseRatio?: number
    aum?: number
    liquidity: 'high' | 'medium' | 'low'
    esgScore?: number
  }
  technicals: {
    rsi: number
    macd: number
    movingAverage50: number
    movingAverage200: number
    support: number
    resistance: number
    trend: 'bullish' | 'bearish' | 'neutral'
  }
  fundamentals?: {
    revenue?: number
    netIncome?: number
    debtToEquity?: number
    currentRatio?: number
    grossMargin?: number
    operatingMargin?: number
    netMargin?: number
  }
}

interface ComparisonMetric {
  key: string
  label: string
  category: 'performance' | 'risk' | 'valuation' | 'technical' | 'fundamental'
  format: 'percent' | 'number' | 'currency' | 'ratio'
  higher: 'better' | 'worse' | 'neutral'
}

const comparisonMetrics: ComparisonMetric[] = [
  { key: 'return1y', label: '1Y Return', category: 'performance', format: 'percent', higher: 'better' },
  { key: 'returnYtd', label: 'YTD Return', category: 'performance', format: 'percent', higher: 'better' },
  { key: 'return3m', label: '3M Return', category: 'performance', format: 'percent', higher: 'better' },
  { key: 'return1m', label: '1M Return', category: 'performance', format: 'percent', higher: 'better' },
  { key: 'volatility', label: 'Volatility', category: 'risk', format: 'percent', higher: 'worse' },
  { key: 'sharpeRatio', label: 'Sharpe Ratio', category: 'risk', format: 'ratio', higher: 'better' },
  { key: 'maxDrawdown', label: 'Max Drawdown', category: 'risk', format: 'percent', higher: 'worse' },
  { key: 'beta', label: 'Beta', category: 'risk', format: 'ratio', higher: 'neutral' },
  { key: 'alpha', label: 'Alpha', category: 'performance', format: 'percent', higher: 'better' },
  { key: 'dividendYield', label: 'Dividend Yield', category: 'valuation', format: 'percent', higher: 'better' },
  { key: 'peRatio', label: 'P/E Ratio', category: 'valuation', format: 'ratio', higher: 'worse' },
  { key: 'pbRatio', label: 'P/B Ratio', category: 'valuation', format: 'ratio', higher: 'worse' },
  { key: 'roe', label: 'ROE', category: 'fundamental', format: 'percent', higher: 'better' },
  { key: 'expenseRatio', label: 'Expense Ratio', category: 'valuation', format: 'percent', higher: 'worse' }
]

const generateMockAssets = (): Asset[] => [
  {
    id: 'spy',
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    type: 'etf',
    region: 'US',
    currency: 'USD',
    price: 445.67,
    marketCap: 412000000000,
    volume: 45678900,
    metrics: {
      return1d: 0.8,
      return1w: 2.3,
      return1m: 4.1,
      return3m: 7.8,
      return6m: 12.4,
      return1y: 18.5,
      return3y: 12.1,
      returnYtd: 15.2,
      volatility: 16.8,
      sharpeRatio: 0.89,
      maxDrawdown: -23.4,
      beta: 1.0,
      alpha: 0.0,
      correlation: 1.0,
      dividendYield: 1.6,
      expenseRatio: 0.09,
      aum: 412000000000,
      liquidity: 'high',
      esgScore: 7.2
    },
    technicals: {
      rsi: 62.4,
      macd: 2.1,
      movingAverage50: 438.90,
      movingAverage200: 421.30,
      support: 435.00,
      resistance: 450.00,
      trend: 'bullish'
    }
  },
  {
    id: 'qqq',
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    type: 'etf',
    region: 'US',
    currency: 'USD',
    price: 378.95,
    marketCap: 189000000000,
    volume: 23456780,
    metrics: {
      return1d: 1.2,
      return1w: 3.8,
      return1m: 6.7,
      return3m: 11.2,
      return6m: 19.8,
      return1y: 28.4,
      return3y: 15.6,
      returnYtd: 24.1,
      volatility: 22.1,
      sharpeRatio: 1.12,
      maxDrawdown: -32.8,
      beta: 1.18,
      alpha: 4.2,
      correlation: 0.85,
      dividendYield: 0.8,
      expenseRatio: 0.20,
      aum: 189000000000,
      liquidity: 'high',
      esgScore: 6.8
    },
    technicals: {
      rsi: 68.9,
      macd: 3.4,
      movingAverage50: 372.15,
      movingAverage200: 341.80,
      support: 370.00,
      resistance: 385.00,
      trend: 'bullish'
    }
  },
  {
    id: 'aapl',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    sector: 'Technology',
    region: 'US',
    currency: 'USD',
    price: 185.50,
    marketCap: 2890000000000,
    volume: 54321000,
    metrics: {
      return1d: 1.8,
      return1w: 4.2,
      return1m: 8.9,
      return3m: 15.6,
      return6m: 22.3,
      return1y: 31.7,
      return3y: 18.9,
      returnYtd: 28.4,
      volatility: 25.4,
      sharpeRatio: 1.08,
      maxDrawdown: -27.5,
      beta: 1.25,
      alpha: 6.8,
      correlation: 0.78,
      dividendYield: 0.5,
      peRatio: 28.5,
      pbRatio: 8.9,
      roe: 31.2,
      liquidity: 'high',
      esgScore: 8.1
    },
    technicals: {
      rsi: 71.2,
      macd: 4.1,
      movingAverage50: 178.90,
      movingAverage200: 162.45,
      support: 180.00,
      resistance: 192.00,
      trend: 'bullish'
    },
    fundamentals: {
      revenue: 394328000000,
      netIncome: 99803000000,
      debtToEquity: 1.73,
      currentRatio: 1.04,
      grossMargin: 44.1,
      operatingMargin: 29.8,
      netMargin: 25.3
    }
  },
  {
    id: 'gld',
    symbol: 'GLD',
    name: 'SPDR Gold Shares',
    type: 'etf',
    region: 'Global',
    currency: 'USD',
    price: 198.45,
    marketCap: 58000000000,
    volume: 8765432,
    metrics: {
      return1d: -0.3,
      return1w: 1.8,
      return1m: 3.2,
      return3m: 8.7,
      return6m: 12.1,
      return1y: 15.8,
      return3y: 8.2,
      returnYtd: 11.4,
      volatility: 19.6,
      sharpeRatio: 0.62,
      maxDrawdown: -18.9,
      beta: 0.15,
      alpha: 2.1,
      correlation: -0.12,
      expenseRatio: 0.40,
      aum: 58000000000,
      liquidity: 'high'
    },
    technicals: {
      rsi: 58.3,
      macd: 1.2,
      movingAverage50: 195.20,
      movingAverage200: 189.75,
      support: 195.00,
      resistance: 205.00,
      trend: 'neutral'
    }
  },
  {
    id: 'btc',
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    type: 'crypto',
    region: 'Global',
    currency: 'USD',
    price: 43250.00,
    volume: 18765432100,
    metrics: {
      return1d: -2.1,
      return1w: 8.4,
      return1m: 15.7,
      return3m: 42.8,
      return6m: 68.9,
      return1y: 156.3,
      return3y: 234.7,
      returnYtd: 145.2,
      volatility: 67.8,
      sharpeRatio: 0.91,
      maxDrawdown: -76.8,
      beta: 0.45,
      alpha: 89.2,
      correlation: 0.18,
      liquidity: 'high'
    },
    technicals: {
      rsi: 45.7,
      macd: -850.5,
      movingAverage50: 44890.00,
      movingAverage200: 38760.00,
      support: 42000.00,
      resistance: 46000.00,
      trend: 'neutral'
    }
  }
]

export function AssetComparison() {
  const { performance } = usePerformanceMonitor('AssetComparison')
  const wsClient = useTradingWebSocket()
  const [availableAssets] = useState<Asset[]>(generateMockAssets())
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([
    availableAssets[0], // SPY
    availableAssets[1]  // QQQ
  ])
  const [viewMode, setViewMode] = useState<'table' | 'charts' | 'radar'>('table')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'return1y', 'returnYtd', 'volatility', 'sharpeRatio', 'maxDrawdown'
  ])
  const [timeframe, setTimeframe] = useState<string>('1y')

  useEffect(() => {
    // Subscribe to asset comparison updates
    const handleComparisonUpdate = (data: any) => {
      if (data.type === 'asset_update') {
        setSelectedAssets(prev => prev.map(asset =>
          asset.id === data.assetId ? { ...asset, ...data.updates } : asset
        ))
      }
    }

    wsClient?.on('comparison_updates', handleComparisonUpdate)
    return () => {
      wsClient?.off('comparison_updates', handleComparisonUpdate)
    }
  }, [wsClient])

  const addAsset = (assetId: string) => {
    const asset = availableAssets.find(a => a.id === assetId)
    if (asset && !selectedAssets.find(a => a.id === assetId)) {
      setSelectedAssets([...selectedAssets, asset])
    }
  }

  const removeAsset = (assetId: string) => {
    setSelectedAssets(selectedAssets.filter(a => a.id !== assetId))
  }

  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricKey)
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    )
  }

  const formatValue = (value: number | undefined, format: ComparisonMetric['format']) => {
    if (value === undefined || value === null) return 'N/A'
    
    switch (format) {
      case 'percent':
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
      case 'ratio':
        return value.toFixed(2)
      case 'number':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  const getValueColor = (value: number | undefined, metric: ComparisonMetric, isHighest: boolean, isLowest: boolean) => {
    if (value === undefined) return 'text-gray-400'
    
    if (metric.higher === 'better') {
      if (isHighest) return 'text-green-600 font-bold'
      if (isLowest) return 'text-red-600'
    } else if (metric.higher === 'worse') {
      if (isLowest) return 'text-green-600 font-bold'
      if (isHighest) return 'text-red-600'
    }
    
    return 'text-gray-900'
  }

  const getPerformanceChart = () => {
    const timeframes = ['1d', '1w', '1m', '3m', '6m', '1y']
    
    return {
      labels: timeframes.map(t => t.toUpperCase()),
      datasets: selectedAssets.map((asset, index) => ({
        label: asset.symbol,
        data: timeframes.map(tf => {
          const key = `return${tf}` as keyof typeof asset.metrics
          return asset.metrics[key] as number
        }),
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)'
        ][index % 5],
        backgroundColor: [
          'rgba(59, 130, 246, 0.1)',
          'rgba(16, 185, 129, 0.1)',
          'rgba(245, 158, 11, 0.1)',
          'rgba(239, 68, 68, 0.1)',
          'rgba(139, 92, 246, 0.1)'
        ][index % 5],
        fill: false,
        tension: 0.4
      }))
    }
  }

  const getRiskReturnChart = () => ({
    datasets: selectedAssets.map((asset, index) => ({
      label: asset.symbol,
      data: [{
        x: asset.metrics.volatility,
        y: asset.metrics.return1y,
        r: 15
      }],
      backgroundColor: [
        'rgba(59, 130, 246, 0.6)',
        'rgba(16, 185, 129, 0.6)',
        'rgba(245, 158, 11, 0.6)',
        'rgba(239, 68, 68, 0.6)',
        'rgba(139, 92, 246, 0.6)'
      ][index % 5]
    }))
  })

  const getRadarChart = () => {
    const radarMetrics = ['return1y', 'sharpeRatio', 'volatility', 'alpha', 'liquidity']
    const normalizeValue = (value: number, key: string) => {
      // Normalize values to 0-100 scale for radar chart
      switch (key) {
        case 'return1y':
        case 'alpha':
          return Math.max(0, Math.min(100, (value + 50) * 1.5))
        case 'sharpeRatio':
          return Math.max(0, Math.min(100, value * 50))
        case 'volatility':
          return Math.max(0, Math.min(100, 100 - value * 2)) // Invert since lower is better
        case 'liquidity':
          return value === 'high' ? 100 : value === 'medium' ? 60 : 30
        default:
          return Math.max(0, Math.min(100, value))
      }
    }

    return {
      labels: radarMetrics.map(m => comparisonMetrics.find(cm => cm.key === m)?.label || m),
      datasets: selectedAssets.map((asset, index) => ({
        label: asset.symbol,
        data: radarMetrics.map(key => {
          const value = key === 'liquidity' ? asset.metrics.liquidity : asset.metrics[key as keyof typeof asset.metrics] as number
          return normalizeValue(value as number, key)
        }),
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgba(139, 92, 246)'
        ][index % 5],
        backgroundColor: [
          'rgba(59, 130, 246, 0.2)',
          'rgba(16, 185, 129, 0.2)',
          'rgba(245, 158, 11, 0.2)',
          'rgba(239, 68, 68, 0.2)',
          'rgba(139, 92, 246, 0.2)'
        ][index % 5],
        pointBackgroundColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgba(139, 92, 246)'
        ][index % 5],
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgba(139, 92, 246)'
        ][index % 5]
      }))
    }
  }

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScaleIcon className="h-6 w-6" />
              Asset Comparison & Analysis
            </CardTitle>
            <CardDescription>
              Compare performance, risk, and characteristics across multiple assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="setup" className="space-y-4">
              <TabsList>
                <TabsTrigger value="setup">Asset Selection</TabsTrigger>
                <TabsTrigger value="comparison">
                  Comparison Analysis
                  <Badge className="ml-2" variant="outline">
                    {selectedAssets.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="charts">Charts & Visuals</TabsTrigger>
                <TabsTrigger value="summary">Summary & Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="setup" className="space-y-6">
                {/* Asset Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Assets for Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedAssets.map(asset => (
                        <div key={asset.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">{asset.symbol}</div>
                              <div className="text-sm text-muted-foreground">{asset.name}</div>
                            </div>
                            <Badge variant="outline">{asset.type}</Badge>
                            {asset.sector && <Badge variant="outline">{asset.sector}</Badge>}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-medium">${asset.price.toFixed(2)}</div>
                              <div className={`text-sm ${asset.metrics.return1d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatValue(asset.metrics.return1d, 'percent')}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeAsset(asset.id)}
                              disabled={selectedAssets.length <= 1}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Available Assets */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add Assets to Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableAssets.filter(a => !selectedAssets.find(s => s.id === a.id)).map(asset => (
                        <div key={asset.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">{asset.symbol}</div>
                              <div className="text-sm text-muted-foreground">{asset.name}</div>
                            </div>
                            <Badge variant="outline">{asset.type}</Badge>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-medium">${asset.price.toFixed(2)}</div>
                              <div className={`text-sm ${asset.metrics.return1d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatValue(asset.metrics.return1d, 'percent')}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addAsset(asset.id)}
                              disabled={selectedAssets.length >= 5}
                            >
                              <PlusIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Metric Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Select Comparison Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {['performance', 'risk', 'valuation', 'fundamental'].map(category => (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium capitalize">{category} Metrics</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {comparisonMetrics.filter(m => m.category === category).map(metric => (
                              <div key={metric.key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={metric.key}
                                  checked={selectedMetrics.includes(metric.key)}
                                  onCheckedChange={() => toggleMetric(metric.key)}
                                />
                                <Label htmlFor={metric.key} className="text-sm">
                                  {metric.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comparison" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Asset Comparison Table</h3>
                  <div className="flex gap-2">
                    <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="table">Table</SelectItem>
                        <SelectItem value="charts">Charts</SelectItem>
                        <SelectItem value="radar">Radar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <div className="p-4">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2 font-medium">Metric</th>
                              {selectedAssets.map(asset => (
                                <th key={asset.id} className="text-center p-2 font-medium">
                                  <div>{asset.symbol}</div>
                                  <div className="text-xs text-muted-foreground font-normal">
                                    {asset.type.toUpperCase()}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedMetrics.map(metricKey => {
                              const metric = comparisonMetrics.find(m => m.key === metricKey)
                              if (!metric) return null

                              const values = selectedAssets.map(asset => {
                                const value = asset.metrics[metricKey as keyof typeof asset.metrics]
                                return typeof value === 'number' ? value : undefined
                              })
                              
                              const validValues = values.filter(v => v !== undefined) as number[]
                              const highest = validValues.length > 0 ? Math.max(...validValues) : undefined
                              const lowest = validValues.length > 0 ? Math.min(...validValues) : undefined

                              return (
                                <tr key={metricKey} className="border-b hover:bg-gray-50">
                                  <td className="p-2 font-medium">
                                    <div className="flex items-center gap-2">
                                      {metric.label}
                                      <Badge variant="outline" className="text-xs">
                                        {metric.category}
                                      </Badge>
                                    </div>
                                  </td>
                                  {selectedAssets.map((asset, index) => {
                                    const value = values[index]
                                    const isHighest = value === highest
                                    const isLowest = value === lowest
                                    
                                    return (
                                      <td key={asset.id} className="p-2 text-center">
                                        <div className={getValueColor(value, metric, isHighest, isLowest)}>
                                          {formatValue(value, metric.format)}
                                        </div>
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Best 1Y Performer</div>
                        <div className="text-xl font-bold text-green-600">
                          {selectedAssets.reduce((best, asset) => 
                            asset.metrics.return1y > best.metrics.return1y ? asset : best
                          ).symbol}
                        </div>
                        <div className="text-sm">
                          {formatValue(Math.max(...selectedAssets.map(a => a.metrics.return1y)), 'percent')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Lowest Risk</div>
                        <div className="text-xl font-bold text-blue-600">
                          {selectedAssets.reduce((lowest, asset) => 
                            asset.metrics.volatility < lowest.metrics.volatility ? asset : lowest
                          ).symbol}
                        </div>
                        <div className="text-sm">
                          {formatValue(Math.min(...selectedAssets.map(a => a.metrics.volatility)), 'percent')} vol
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Best Sharpe Ratio</div>
                        <div className="text-xl font-bold text-purple-600">
                          {selectedAssets.reduce((best, asset) => 
                            asset.metrics.sharpeRatio > best.metrics.sharpeRatio ? asset : best
                          ).symbol}
                        </div>
                        <div className="text-sm">
                          {formatValue(Math.max(...selectedAssets.map(a => a.metrics.sharpeRatio)), 'ratio')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="charts" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Performance Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <Line
                          data={getPerformanceChart()}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                ticks: {
                                  callback: function(value) {
                                    return value + '%'
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk-Return Scatter */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk vs Return</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 rounded flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">
                            Risk-Return Scatter Plot
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Radar Chart */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Multi-Metric Radar Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <Radar
                          data={getRadarChart()}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              r: {
                                beginAtZero: true,
                                max: 100
                              }
                            }
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedAssets.map(asset => (
                    <Card key={asset.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div>
                            <div>{asset.symbol}</div>
                            <div className="text-sm text-muted-foreground font-normal">
                              {asset.name}
                            </div>
                          </div>
                          <Badge variant="outline">{asset.type}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Current Price</div>
                            <div className="text-lg font-bold">${asset.price.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">1Y Return</div>
                            <div className={`text-lg font-bold ${asset.metrics.return1y >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatValue(asset.metrics.return1y, 'percent')}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Volatility</div>
                            <div className="text-lg font-medium">{formatValue(asset.metrics.volatility, 'percent')}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Sharpe Ratio</div>
                            <div className="text-lg font-medium">{formatValue(asset.metrics.sharpeRatio, 'ratio')}</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Key Characteristics</h4>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">{asset.region}</Badge>
                            <Badge variant="outline">{asset.currency}</Badge>
                            <Badge variant="outline">{asset.metrics.liquidity} liquidity</Badge>
                            {asset.sector && <Badge variant="outline">{asset.sector}</Badge>}
                            {asset.metrics.esgScore && (
                              <Badge variant="outline">ESG: {asset.metrics.esgScore.toFixed(1)}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Technical Analysis</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>RSI: {asset.technicals.rsi.toFixed(1)}</div>
                            <div>Trend: {asset.technicals.trend}</div>
                            <div>Support: ${asset.technicals.support.toFixed(2)}</div>
                            <div>Resistance: ${asset.technicals.resistance.toFixed(2)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Overall Comparison Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Comparison Summary & Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-green-50 rounded">
                        <h4 className="font-medium text-green-800">Best for Growth</h4>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedAssets.reduce((best, asset) => 
                            asset.metrics.return1y > best.metrics.return1y ? asset : best
                          ).symbol}
                        </div>
                        <p className="text-sm text-green-700">
                          Highest 1-year return with strong momentum
                        </p>
                      </div>
                      
                      <div className="p-4 bg-blue-50 rounded">
                        <h4 className="font-medium text-blue-800">Best Risk-Adjusted</h4>
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedAssets.reduce((best, asset) => 
                            asset.metrics.sharpeRatio > best.metrics.sharpeRatio ? asset : best
                          ).symbol}
                        </div>
                        <p className="text-sm text-blue-700">
                          Optimal risk-return balance
                        </p>
                      </div>
                      
                      <div className="p-4 bg-purple-50 rounded">
                        <h4 className="font-medium text-purple-800">Most Stable</h4>
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedAssets.reduce((best, asset) => 
                            asset.metrics.volatility < best.metrics.volatility ? asset : best
                          ).symbol}
                        </div>
                        <p className="text-sm text-purple-700">
                          Lowest volatility and drawdowns
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded">
                      <h4 className="font-medium mb-2">Portfolio Allocation Suggestion</h4>
                      <p className="text-sm text-muted-foreground">
                        Based on the comparison analysis, consider a balanced allocation weighted by 
                        risk-adjusted returns and correlation benefits for optimal diversification.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PremiumThemeProvider>
  )
}