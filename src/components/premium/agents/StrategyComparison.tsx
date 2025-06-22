'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ScaleIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FireIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Radar, Scatter } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Strategy {
  id: string
  name: string
  type: 'momentum' | 'mean_reversion' | 'arbitrage' | 'market_making' | 'sentiment' | 'technical' | 'fundamental'
  status: 'active' | 'paused' | 'stopped' | 'testing'
  performance: {
    totalReturn: number
    annualizedReturn: number
    sharpeRatio: number
    sortinoRatio: number
    maxDrawdown: number
    winRate: number
    profitFactor: number
    avgWin: number
    avgLoss: number
    totalTrades: number
    currentStreak: number
    bestStreak: number
    worstStreak: number
    recoveryTime: number
    calmarRatio: number
  }
  risk: {
    var95: number
    cvar95: number
    beta: number
    alpha: number
    correlation: number
    volatility: number
    downside: number
    upside: number
    tailRisk: number
    stressTest: number
  }
  allocation: {
    capital: number
    utilization: number
    maxPosition: number
    avgPosition: number
    turnover: number
    leverage: number
  }
  costs: {
    commission: number
    slippage: number
    financing: number
    total: number
    impact: number
  }
  timeframe: {
    start: Date
    end: Date
    activeDays: number
    avgHoldingPeriod: number
    tradeFrequency: number
  }
}

const generateMockStrategies = (): Strategy[] => {
  const types: Strategy['type'][] = ['momentum', 'mean_reversion', 'arbitrage', 'market_making', 'sentiment', 'technical', 'fundamental']
  const statuses: Strategy['status'][] = ['active', 'paused', 'stopped', 'testing']
  
  return Array.from({ length: 8 }, (_, i) => ({
    id: `strategy-${i + 1}`,
    name: `Strategy ${String.fromCharCode(65 + i)}`,
    type: types[i % types.length],
    status: statuses[i % statuses.length],
    performance: {
      totalReturn: Math.random() * 200 - 50,
      annualizedReturn: Math.random() * 100 - 20,
      sharpeRatio: Math.random() * 3,
      sortinoRatio: Math.random() * 4,
      maxDrawdown: -Math.random() * 30,
      winRate: Math.random() * 0.3 + 0.4,
      profitFactor: Math.random() * 2 + 0.5,
      avgWin: Math.random() * 1000 + 500,
      avgLoss: -Math.random() * 800 - 200,
      totalTrades: Math.floor(Math.random() * 1000) + 100,
      currentStreak: Math.floor(Math.random() * 20) - 10,
      bestStreak: Math.floor(Math.random() * 30) + 5,
      worstStreak: -Math.floor(Math.random() * 20) - 3,
      recoveryTime: Math.floor(Math.random() * 30) + 5,
      calmarRatio: Math.random() * 2
    },
    risk: {
      var95: -Math.random() * 5000 - 1000,
      cvar95: -Math.random() * 7000 - 2000,
      beta: Math.random() * 2 - 0.5,
      alpha: Math.random() * 0.2 - 0.05,
      correlation: Math.random() * 2 - 1,
      volatility: Math.random() * 30 + 10,
      downside: Math.random() * 20 + 5,
      upside: Math.random() * 25 + 10,
      tailRisk: Math.random() * 10,
      stressTest: -Math.random() * 40 - 10
    },
    allocation: {
      capital: Math.random() * 1000000 + 100000,
      utilization: Math.random() * 0.8 + 0.2,
      maxPosition: Math.random() * 100000 + 10000,
      avgPosition: Math.random() * 50000 + 5000,
      turnover: Math.random() * 50 + 5,
      leverage: Math.random() * 3 + 1
    },
    costs: {
      commission: Math.random() * 10000 + 1000,
      slippage: Math.random() * 5000 + 500,
      financing: Math.random() * 3000 + 300,
      total: 0,
      impact: Math.random() * 5
    },
    timeframe: {
      start: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      end: new Date(),
      activeDays: Math.floor(Math.random() * 300) + 50,
      avgHoldingPeriod: Math.random() * 10 + 0.1,
      tradeFrequency: Math.random() * 100 + 10
    }
  })).map(s => ({
    ...s,
    costs: {
      ...s.costs,
      total: s.costs.commission + s.costs.slippage + s.costs.financing
    }
  }))
}

interface ComparisonMetric {
  key: keyof Strategy['performance'] | keyof Strategy['risk'] | keyof Strategy['allocation']
  label: string
  category: 'performance' | 'risk' | 'allocation'
  format: 'percent' | 'number' | 'currency' | 'ratio'
  higher_better: boolean
}

const comparisonMetrics: ComparisonMetric[] = [
  { key: 'totalReturn', label: 'Total Return', category: 'performance', format: 'percent', higher_better: true },
  { key: 'sharpeRatio', label: 'Sharpe Ratio', category: 'performance', format: 'ratio', higher_better: true },
  { key: 'maxDrawdown', label: 'Max Drawdown', category: 'performance', format: 'percent', higher_better: false },
  { key: 'winRate', label: 'Win Rate', category: 'performance', format: 'percent', higher_better: true },
  { key: 'profitFactor', label: 'Profit Factor', category: 'performance', format: 'ratio', higher_better: true },
  { key: 'var95', label: 'VaR (95%)', category: 'risk', format: 'currency', higher_better: false },
  { key: 'volatility', label: 'Volatility', category: 'risk', format: 'percent', higher_better: false },
  { key: 'beta', label: 'Beta', category: 'risk', format: 'ratio', higher_better: false },
  { key: 'utilization', label: 'Capital Utilization', category: 'allocation', format: 'percent', higher_better: true },
  { key: 'turnover', label: 'Turnover', category: 'allocation', format: 'ratio', higher_better: false }
]

export function StrategyComparison() {
  const { performance } = usePerformanceMonitor('StrategyComparison')
  const wsClient = useTradingWebSocket()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([])
  const [comparisonView, setComparisonView] = useState<'table' | 'radar' | 'scatter' | 'ranking'>('table')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(comparisonMetrics.slice(0, 5).map(m => m.key))
  const [timeRange, setTimeRange] = useState<'1m' | '3m' | '6m' | '1y' | 'all'>('1y')
  const [weights, setWeights] = useState<Record<string, number>>({})

  useEffect(() => {
    // Load initial data
    const mockData = generateMockStrategies()
    setStrategies(mockData)
    setSelectedStrategies(mockData.slice(0, 3).map(s => s.id))
    
    // Initialize weights
    const initialWeights: Record<string, number> = {}
    comparisonMetrics.forEach(m => {
      initialWeights[m.key] = 1
    })
    setWeights(initialWeights)

    // Subscribe to updates
    const handleUpdate = (data: any) => {
      if (data.type === 'strategy_update') {
        setStrategies(prev => prev.map(s => 
          s.id === data.strategyId ? { ...s, ...data.updates } : s
        ))
      }
    }

    wsClient?.on('strategy_comparison', handleUpdate)
    return () => {
      wsClient?.off('strategy_comparison', handleUpdate)
    }
  }, [wsClient])

  const formatValue = (value: number, format: ComparisonMetric['format']) => {
    switch (format) {
      case 'percent':
        return `${value.toFixed(2)}%`
      case 'currency':
        return `$${Math.abs(value).toLocaleString()}`
      case 'ratio':
        return value.toFixed(2)
      case 'number':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  const calculateScore = (strategy: Strategy) => {
    let score = 0
    selectedMetrics.forEach(metricKey => {
      const metric = comparisonMetrics.find(m => m.key === metricKey)
      if (!metric) return
      
      const value = metric.category === 'performance' 
        ? strategy.performance[metricKey as keyof Strategy['performance']]
        : metric.category === 'risk'
        ? strategy.risk[metricKey as keyof Strategy['risk']]
        : strategy.allocation[metricKey as keyof Strategy['allocation']]
      
      const normalizedValue = typeof value === 'number' ? value : 0
      const weight = weights[metricKey] || 1
      
      if (metric.higher_better) {
        score += normalizedValue * weight
      } else {
        score -= normalizedValue * weight
      }
    })
    return score
  }

  const getRadarData = () => {
    const selectedData = strategies.filter(s => selectedStrategies.includes(s.id))
    
    return {
      labels: selectedMetrics.map(key => 
        comparisonMetrics.find(m => m.key === key)?.label || key
      ),
      datasets: selectedData.map((strategy, idx) => ({
        label: strategy.name,
        data: selectedMetrics.map(metricKey => {
          const metric = comparisonMetrics.find(m => m.key === metricKey)
          if (!metric) return 0
          
          const value = metric.category === 'performance'
            ? strategy.performance[metricKey as keyof Strategy['performance']]
            : metric.category === 'risk'
            ? strategy.risk[metricKey as keyof Strategy['risk']]
            : strategy.allocation[metricKey as keyof Strategy['allocation']]
          
          // Normalize values for radar chart
          return typeof value === 'number' ? Math.abs(value) : 0
        }),
        backgroundColor: `hsla(${idx * 120}, 70%, 50%, 0.2)`,
        borderColor: `hsl(${idx * 120}, 70%, 50%)`,
        borderWidth: 2
      }))
    }
  }

  const getScatterData = () => {
    const xMetric = comparisonMetrics[0]
    const yMetric = comparisonMetrics[1]
    
    return {
      datasets: strategies.filter(s => selectedStrategies.includes(s.id)).map((strategy, idx) => ({
        label: strategy.name,
        data: [{
          x: strategy.performance[xMetric.key as keyof Strategy['performance']] as number || 0,
          y: strategy.performance[yMetric.key as keyof Strategy['performance']] as number || 0
        }],
        backgroundColor: `hsl(${idx * 120}, 70%, 50%)`,
        pointRadius: 8
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
              Strategy Comparison
            </CardTitle>
            <CardDescription>
              Compare multiple strategies across key performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Strategy Selection */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium">Select Strategies:</span>
                {strategies.map(strategy => (
                  <Button
                    key={strategy.id}
                    variant={selectedStrategies.includes(strategy.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedStrategies(prev =>
                        prev.includes(strategy.id)
                          ? prev.filter(id => id !== strategy.id)
                          : [...prev, strategy.id]
                      )
                    }}
                  >
                    {strategy.name}
                    <Badge className="ml-2" variant={
                      strategy.status === 'active' ? 'default' :
                      strategy.status === 'testing' ? 'secondary' :
                      'outline'
                    }>
                      {strategy.status}
                    </Badge>
                  </Button>
                ))}
              </div>

              {/* View Selection */}
              <Tabs value={comparisonView} onValueChange={(v: any) => setComparisonView(v)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="table">Table</TabsTrigger>
                  <TabsTrigger value="radar">Radar</TabsTrigger>
                  <TabsTrigger value="scatter">Scatter</TabsTrigger>
                  <TabsTrigger value="ranking">Ranking</TabsTrigger>
                </TabsList>

                <TabsContent value="table" className="space-y-4">
                  <ScrollArea className="h-[600px]">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left p-2">Metric</th>
                          {strategies.filter(s => selectedStrategies.includes(s.id)).map(strategy => (
                            <th key={strategy.id} className="text-right p-2">{strategy.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonMetrics.map(metric => (
                          <tr key={metric.key} className="border-t">
                            <td className="p-2 font-medium">{metric.label}</td>
                            {strategies.filter(s => selectedStrategies.includes(s.id)).map(strategy => {
                              const value = metric.category === 'performance'
                                ? strategy.performance[metric.key as keyof Strategy['performance']]
                                : metric.category === 'risk'
                                ? strategy.risk[metric.key as keyof Strategy['risk']]
                                : strategy.allocation[metric.key as keyof Strategy['allocation']]
                              
                              const numValue = typeof value === 'number' ? value : 0
                              const isPositive = metric.higher_better ? numValue > 0 : numValue < 0
                              
                              return (
                                <td key={strategy.id} className={`text-right p-2 ${
                                  isPositive ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatValue(numValue, metric.format)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="radar">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm font-medium">Metrics:</span>
                      {comparisonMetrics.map(metric => (
                        <Button
                          key={metric.key}
                          variant={selectedMetrics.includes(metric.key) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedMetrics(prev =>
                              prev.includes(metric.key)
                                ? prev.filter(k => k !== metric.key)
                                : [...prev, metric.key]
                            )
                          }}
                        >
                          {metric.label}
                        </Button>
                      ))}
                    </div>
                    <div className="h-[500px]">
                      <Radar
                        data={getRadarData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            r: {
                              beginAtZero: true
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="scatter">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">X-Axis</label>
                        <Select defaultValue="totalReturn">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {comparisonMetrics.map(metric => (
                              <SelectItem key={metric.key} value={metric.key}>
                                {metric.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Y-Axis</label>
                        <Select defaultValue="sharpeRatio">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {comparisonMetrics.map(metric => (
                              <SelectItem key={metric.key} value={metric.key}>
                                {metric.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="h-[500px]">
                      <Scatter
                        data={getScatterData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            x: {
                              title: {
                                display: true,
                                text: 'Total Return (%)'
                              }
                            },
                            y: {
                              title: {
                                display: true,
                                text: 'Sharpe Ratio'
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ranking" className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <h3 className="font-semibold">Metric Weights</h3>
                      {selectedMetrics.map(metricKey => {
                        const metric = comparisonMetrics.find(m => m.key === metricKey)
                        if (!metric) return null
                        
                        return (
                          <div key={metricKey} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">{metric.label}</span>
                              <span className="text-sm font-medium">{weights[metricKey]?.toFixed(1)}</span>
                            </div>
                            <Slider
                              value={[weights[metricKey] || 1]}
                              onValueChange={([value]) => {
                                setWeights(prev => ({ ...prev, [metricKey]: value }))
                              }}
                              min={0}
                              max={5}
                              step={0.1}
                            />
                          </div>
                        )
                      })}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">Strategy Rankings</h3>
                      {strategies
                        .filter(s => selectedStrategies.includes(s.id))
                        .map(s => ({ ...s, score: calculateScore(s) }))
                        .sort((a, b) => b.score - a.score)
                        .map((strategy, idx) => (
                          <Card key={strategy.id}>
                            <CardContent className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-4">
                                <div className="text-2xl font-bold">#{idx + 1}</div>
                                <div>
                                  <div className="font-semibold">{strategy.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Score: {strategy.score.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  strategy.performance.totalReturn > 0 ? 'default' : 'destructive'
                                }>
                                  {formatValue(strategy.performance.totalReturn, 'percent')}
                                </Badge>
                                <Badge variant="outline">
                                  SR: {strategy.performance.sharpeRatio.toFixed(2)}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
    </PremiumThemeProvider>
  )
}