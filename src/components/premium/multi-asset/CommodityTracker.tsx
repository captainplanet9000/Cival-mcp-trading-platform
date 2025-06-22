'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  CubeIcon,
  FireIcon,
  SparklesIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  GlobeAltIcon,
  ClockIcon,
  ChartBarIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Commodity {
  symbol: string
  name: string
  category: 'energy' | 'metals' | 'precious_metals' | 'agriculture' | 'livestock' | 'soft_commodities'
  unit: string
  price: number
  change24h: number
  changePercent24h: number
  volume: number
  openInterest?: number
  high52w: number
  low52w: number
  ytdReturn: number
  exchange: string
  contractMonth?: string
  specifications: {
    contractSize: string
    tickSize: number
    dailyLimit?: number
    marginRequirement: number
  }
  fundamentals: {
    globalProduction?: number
    consumption?: number
    inventories?: number
    seasonality: 'high' | 'medium' | 'low'
    weatherSensitive: boolean
    geopoliticalRisk: 'high' | 'medium' | 'low'
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
  lastUpdate: Date
}

interface MarketNews {
  id: string
  headline: string
  summary: string
  commodity: string
  category: string
  impact: 'high' | 'medium' | 'low'
  source: string
  timestamp: Date
  region?: string
}

interface SeasonalPattern {
  month: string
  historicalChange: number
  confidence: number
  drivers: string[]
}

const generateMockCommodities = (): Commodity[] => [
  {
    symbol: 'CL',
    name: 'Crude Oil WTI',
    category: 'energy',
    unit: 'USD/barrel',
    price: 72.45,
    change24h: 1.23,
    changePercent24h: 1.72,
    volume: 234567890,
    openInterest: 1567890,
    high52w: 95.03,
    low52w: 62.18,
    ytdReturn: 8.7,
    exchange: 'NYMEX',
    contractMonth: 'Mar 2024',
    specifications: {
      contractSize: '1,000 barrels',
      tickSize: 0.01,
      dailyLimit: 10.00,
      marginRequirement: 5000
    },
    fundamentals: {
      globalProduction: 100.2,
      consumption: 101.8,
      inventories: 420.5,
      seasonality: 'medium',
      weatherSensitive: false,
      geopoliticalRisk: 'high'
    },
    technicals: {
      rsi: 64.2,
      macd: 1.45,
      movingAverage50: 71.20,
      movingAverage200: 68.90,
      support: 70.00,
      resistance: 75.00,
      trend: 'bullish'
    },
    lastUpdate: new Date()
  },
  {
    symbol: 'NG',
    name: 'Natural Gas',
    category: 'energy',
    unit: 'USD/MMBtu',
    price: 2.876,
    change24h: -0.087,
    changePercent24h: -2.94,
    volume: 156789000,
    openInterest: 987654,
    high52w: 9.664,
    low52w: 1.992,
    ytdReturn: -15.8,
    exchange: 'NYMEX',
    contractMonth: 'Mar 2024',
    specifications: {
      contractSize: '10,000 MMBtu',
      tickSize: 0.001,
      dailyLimit: 1.50,
      marginRequirement: 3500
    },
    fundamentals: {
      globalProduction: 4000.2,
      consumption: 4050.8,
      inventories: 2420.5,
      seasonality: 'high',
      weatherSensitive: true,
      geopoliticalRisk: 'medium'
    },
    technicals: {
      rsi: 38.7,
      macd: -0.12,
      movingAverage50: 3.12,
      movingAverage200: 4.67,
      support: 2.75,
      resistance: 3.10,
      trend: 'bearish'
    },
    lastUpdate: new Date()
  },
  {
    symbol: 'GC',
    name: 'Gold',
    category: 'precious_metals',
    unit: 'USD/troy oz',
    price: 2034.50,
    change24h: 18.70,
    changePercent24h: 0.93,
    volume: 89012345,
    openInterest: 456789,
    high52w: 2135.40,
    low52w: 1810.20,
    ytdReturn: 4.2,
    exchange: 'COMEX',
    contractMonth: 'Apr 2024',
    specifications: {
      contractSize: '100 troy oz',
      tickSize: 0.10,
      marginRequirement: 8500
    },
    fundamentals: {
      globalProduction: 3200.5,
      consumption: 4200.1,
      inventories: 35000.0,
      seasonality: 'low',
      weatherSensitive: false,
      geopoliticalRisk: 'medium'
    },
    technicals: {
      rsi: 58.3,
      macd: 12.5,
      movingAverage50: 2018.90,
      movingAverage200: 1958.75,
      support: 2010.00,
      resistance: 2050.00,
      trend: 'bullish'
    },
    lastUpdate: new Date()
  },
  {
    symbol: 'SI',
    name: 'Silver',
    category: 'precious_metals',
    unit: 'USD/troy oz',
    price: 23.45,
    change24h: 0.67,
    changePercent24h: 2.94,
    volume: 45678901,
    openInterest: 123456,
    high52w: 26.18,
    low52w: 20.02,
    ytdReturn: 1.8,
    exchange: 'COMEX',
    contractMonth: 'Mar 2024',
    specifications: {
      contractSize: '5,000 troy oz',
      tickSize: 0.005,
      marginRequirement: 6500
    },
    fundamentals: {
      globalProduction: 26000.5,
      consumption: 32000.1,
      inventories: 1800.0,
      seasonality: 'low',
      weatherSensitive: false,
      geopoliticalRisk: 'low'
    },
    technicals: {
      rsi: 67.1,
      macd: 0.89,
      movingAverage50: 22.90,
      movingAverage200: 22.15,
      support: 22.80,
      resistance: 24.00,
      trend: 'bullish'
    },
    lastUpdate: new Date()
  },
  {
    symbol: 'HG',
    name: 'Copper',
    category: 'metals',
    unit: 'USD/lb',
    price: 3.847,
    change24h: -0.023,
    changePercent24h: -0.59,
    volume: 34567890,
    openInterest: 234567,
    high52w: 4.348,
    low52w: 3.155,
    ytdReturn: 2.1,
    exchange: 'COMEX',
    contractMonth: 'Mar 2024',
    specifications: {
      contractSize: '25,000 lbs',
      tickSize: 0.0005,
      marginRequirement: 4500
    },
    fundamentals: {
      globalProduction: 21000.5,
      consumption: 25000.1,
      inventories: 145.8,
      seasonality: 'medium',
      weatherSensitive: false,
      geopoliticalRisk: 'medium'
    },
    technicals: {
      rsi: 48.9,
      macd: -0.034,
      movingAverage50: 3.89,
      movingAverage200: 3.76,
      support: 3.80,
      resistance: 3.90,
      trend: 'neutral'
    },
    lastUpdate: new Date()
  },
  {
    symbol: 'C',
    name: 'Corn',
    category: 'agriculture',
    unit: 'USD/bushel',
    price: 4.567,
    change24h: 0.089,
    changePercent24h: 1.98,
    volume: 23456789,
    openInterest: 456789,
    high52w: 6.875,
    low52w: 4.101,
    ytdReturn: -8.5,
    exchange: 'CBOT',
    contractMonth: 'Mar 2024',
    specifications: {
      contractSize: '5,000 bushels',
      tickSize: 0.0025,
      dailyLimit: 0.25,
      marginRequirement: 1800
    },
    fundamentals: {
      globalProduction: 1210.5,
      consumption: 1185.1,
      inventories: 32.8,
      seasonality: 'high',
      weatherSensitive: true,
      geopoliticalRisk: 'medium'
    },
    technicals: {
      rsi: 52.7,
      macd: 0.067,
      movingAverage50: 4.52,
      movingAverage200: 5.12,
      support: 4.45,
      resistance: 4.70,
      trend: 'neutral'
    },
    lastUpdate: new Date()
  },
  {
    symbol: 'W',
    name: 'Wheat',
    category: 'agriculture',
    unit: 'USD/bushel',
    price: 5.678,
    change24h: -0.134,
    changePercent24h: -2.31,
    volume: 15678901,
    openInterest: 234567,
    high52w: 9.375,
    low52w: 5.125,
    ytdReturn: -12.8,
    exchange: 'CBOT',
    contractMonth: 'Mar 2024',
    specifications: {
      contractSize: '5,000 bushels',
      tickSize: 0.0025,
      dailyLimit: 0.60,
      marginRequirement: 2200
    },
    fundamentals: {
      globalProduction: 781.2,
      consumption: 788.5,
      inventories: 267.8,
      seasonality: 'high',
      weatherSensitive: true,
      geopoliticalRisk: 'high'
    },
    technicals: {
      rsi: 41.3,
      macd: -0.089,
      movingAverage50: 6.12,
      movingAverage200: 7.45,
      support: 5.50,
      resistance: 6.00,
      trend: 'bearish'
    },
    lastUpdate: new Date()
  },
  {
    symbol: 'KC',
    name: 'Coffee',
    category: 'soft_commodities',
    unit: 'USD/lb',
    price: 1.634,
    change24h: 0.045,
    changePercent24h: 2.83,
    volume: 12345678,
    openInterest: 123456,
    high52w: 2.432,
    low52w: 1.245,
    ytdReturn: 15.7,
    exchange: 'ICE',
    contractMonth: 'Mar 2024',
    specifications: {
      contractSize: '37,500 lbs',
      tickSize: 0.0005,
      marginRequirement: 3500
    },
    fundamentals: {
      globalProduction: 175.2,
      consumption: 171.8,
      inventories: 28.5,
      seasonality: 'high',
      weatherSensitive: true,
      geopoliticalRisk: 'medium'
    },
    technicals: {
      rsi: 71.8,
      macd: 0.078,
      movingAverage50: 1.58,
      movingAverage200: 1.45,
      support: 1.60,
      resistance: 1.70,
      trend: 'bullish'
    },
    lastUpdate: new Date()
  }
]

const generateMockNews = (): MarketNews[] => [
  {
    id: '1',
    headline: 'OPEC+ extends production cuts through Q2 2024',
    summary: 'Organization agrees to maintain current production levels amid global economic uncertainty',
    commodity: 'Crude Oil',
    category: 'energy',
    impact: 'high',
    source: 'Energy Intelligence',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    region: 'Global'
  },
  {
    id: '2',
    headline: 'China increases copper imports as infrastructure spending rises',
    summary: 'Chinese demand for industrial metals strengthens on government stimulus measures',
    commodity: 'Copper',
    category: 'metals',
    impact: 'medium',
    source: 'Metal Bulletin',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    region: 'Asia'
  },
  {
    id: '3',
    headline: 'Severe drought threatens Brazilian coffee harvest',
    summary: 'Weather concerns drive coffee prices higher as key growing regions face water shortage',
    commodity: 'Coffee',
    category: 'soft_commodities',
    impact: 'high',
    source: 'Coffee Research Institute',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    region: 'South America'
  },
  {
    id: '4',
    headline: 'Gold finds support near $2000 as Fed signals rate pause',
    summary: 'Precious metals rally on expectations of monetary policy normalization',
    commodity: 'Gold',
    category: 'precious_metals',
    impact: 'medium',
    source: 'Precious Metals Focus',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    region: 'Global'
  }
]

const generateSeasonalPatterns = (): Record<string, SeasonalPattern[]> => ({
  'Natural Gas': [
    { month: 'Jan', historicalChange: 15.2, confidence: 0.78, drivers: ['Heating demand', 'Winter weather'] },
    { month: 'Feb', historicalChange: 8.4, confidence: 0.72, drivers: ['Continued heating demand'] },
    { month: 'Mar', historicalChange: -12.8, confidence: 0.81, drivers: ['End of heating season'] },
    { month: 'Apr', historicalChange: -18.5, confidence: 0.85, drivers: ['Shoulder season', 'Storage build'] }
  ],
  'Corn': [
    { month: 'Mar', historicalChange: 5.2, confidence: 0.69, drivers: ['Planting intentions'] },
    { month: 'Apr', historicalChange: 8.7, confidence: 0.74, drivers: ['Weather concerns', 'Planting delays'] },
    { month: 'May', historicalChange: 12.4, confidence: 0.82, drivers: ['Critical planting period'] },
    { month: 'Jun', historicalChange: -6.8, confidence: 0.76, drivers: ['Good growing conditions'] }
  ],
  'Coffee': [
    { month: 'Jan', historicalChange: 3.2, confidence: 0.65, drivers: ['Brazilian harvest concerns'] },
    { month: 'Feb', historicalChange: 8.9, confidence: 0.71, drivers: ['Weather risk premium'] },
    { month: 'Mar', historicalChange: 15.6, confidence: 0.83, drivers: ['Frost season begins'] },
    { month: 'Apr', historicalChange: -4.2, confidence: 0.68, drivers: ['Harvest begins'] }
  ]
})

export function CommodityTracker() {
  const { performance } = usePerformanceMonitor('CommodityTracker')
  const wsClient = useTradingWebSocket()
  const [commodities, setCommodities] = useState<Commodity[]>(generateMockCommodities())
  const [news, setNews] = useState<MarketNews[]>(generateMockNews())
  const [seasonalPatterns] = useState(generateSeasonalPatterns())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedCommodity, setSelectedCommodity] = useState<string>('CL')
  const [viewMode, setViewMode] = useState<'table' | 'charts' | 'heatmap'>('table')

  useEffect(() => {
    // Subscribe to commodity updates
    const handleCommodityUpdate = (data: any) => {
      if (data.type === 'price_update') {
        setCommodities(prev => prev.map(commodity =>
          commodity.symbol === data.symbol 
            ? { ...commodity, ...data.updates, lastUpdate: new Date() }
            : commodity
        ))
      } else if (data.type === 'news_update') {
        setNews(prev => [data.news, ...prev.slice(0, 19)]) // Keep last 20 news items
      }
    }

    wsClient?.on('commodity_updates', handleCommodityUpdate)

    // Simulate real-time price updates
    const interval = setInterval(() => {
      setCommodities(prev => prev.map(commodity => ({
        ...commodity,
        price: commodity.price * (1 + (Math.random() - 0.5) * 0.01),
        change24h: commodity.change24h + (Math.random() - 0.5) * 0.1,
        changePercent24h: commodity.changePercent24h + (Math.random() - 0.5) * 0.05,
        lastUpdate: new Date()
      })))
    }, 5000)

    return () => {
      wsClient?.off('commodity_updates', handleCommodityUpdate)
      clearInterval(interval)
    }
  }, [wsClient])

  const filteredCommodities = selectedCategory === 'all' 
    ? commodities 
    : commodities.filter(c => c.category === selectedCategory)

  const selectedCommodityData = commodities.find(c => c.symbol === selectedCommodity)

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'energy': return <FireIcon className="h-4 w-4" />
      case 'metals': case 'precious_metals': return <CubeIcon className="h-4 w-4" />
      case 'agriculture': case 'soft_commodities': return <SparklesIcon className="h-4 w-4" />
      default: return <CubeIcon className="h-4 w-4" />
    }
  }

  const getCategoryPerformanceChart = () => {
    const categories = ['energy', 'metals', 'precious_metals', 'agriculture', 'soft_commodities']
    const categoryPerf = categories.map(cat => {
      const catCommodities = commodities.filter(c => c.category === cat)
      return catCommodities.length > 0 
        ? catCommodities.reduce((sum, c) => sum + c.ytdReturn, 0) / catCommodities.length
        : 0
    })

    return {
      labels: categories.map(cat => cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())),
      datasets: [{
        label: 'YTD Performance (%)',
        data: categoryPerf,
        backgroundColor: categoryPerf.map(perf => 
          perf >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'
        ),
        borderColor: categoryPerf.map(perf => 
          perf >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 1
      }]
    }
  }

  const getCommodityPriceChart = () => {
    if (!selectedCommodityData) return { labels: [], datasets: [] }
    
    // Generate mock historical data
    const days = 30
    const data = Array.from({ length: days }, (_, i) => {
      const basePrice = selectedCommodityData.price
      const variation = (Math.random() - 0.5) * 0.1
      return basePrice * (1 + variation * (i / days))
    })

    return {
      labels: Array.from({ length: days }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (days - i - 1))
        return date.toLocaleDateString()
      }),
      datasets: [{
        label: selectedCommodityData.name,
        data: data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }]
    }
  }

  const formatPrice = (price: number, commodity: Commodity) => {
    if (commodity.unit.includes('USD')) {
      return `$${price.toFixed(commodity.symbol === 'NG' ? 3 : 2)}`
    }
    return `${price.toFixed(3)} ${commodity.unit}`
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CubeIcon className="h-6 w-6" />
              Commodity Market Tracker
            </CardTitle>
            <CardDescription>
              Real-time commodity prices, fundamentals, and market analysis across all major sectors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Market Overview</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
                <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
                <TabsTrigger value="seasonal">Seasonal Patterns</TabsTrigger>
                <TabsTrigger value="news">Market News</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Category Filter */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Commodity Prices</h3>
                  <div className="flex gap-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="energy">Energy</SelectItem>
                        <SelectItem value="metals">Metals</SelectItem>
                        <SelectItem value="precious_metals">Precious Metals</SelectItem>
                        <SelectItem value="agriculture">Agriculture</SelectItem>
                        <SelectItem value="soft_commodities">Soft Commodities</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="table">Table</SelectItem>
                        <SelectItem value="charts">Charts</SelectItem>
                        <SelectItem value="heatmap">Heatmap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Category Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Category Performance (YTD)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <Bar
                        data={getCategoryPerformanceChart()}
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

                {/* Commodity Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Live Commodity Prices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {filteredCommodities.map(commodity => (
                          <div key={commodity.symbol} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 rounded">
                                {getCategoryIcon(commodity.category)}
                              </div>
                              <div>
                                <div className="font-medium">{commodity.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {commodity.symbol} • {commodity.exchange}
                                  {commodity.contractMonth && ` • ${commodity.contractMonth}`}
                                </div>
                              </div>
                              <Badge variant="outline">{commodity.category.replace('_', ' ')}</Badge>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-mono text-lg">
                                {formatPrice(commodity.price, commodity)}
                              </div>
                              <div className={`text-sm flex items-center gap-1 ${
                                commodity.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {commodity.changePercent24h >= 0 ? 
                                  <TrendingUpIcon className="h-3 w-3" /> : 
                                  <TrendingDownIcon className="h-3 w-3" />
                                }
                                {formatPercent(commodity.changePercent24h)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Best Performer</div>
                        <div className="text-xl font-bold text-green-600">
                          {commodities.reduce((best, c) => c.ytdReturn > best.ytdReturn ? c : best).name}
                        </div>
                        <div className="text-sm">
                          {formatPercent(Math.max(...commodities.map(c => c.ytdReturn)))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Worst Performer</div>
                        <div className="text-xl font-bold text-red-600">
                          {commodities.reduce((worst, c) => c.ytdReturn < worst.ytdReturn ? c : worst).name}
                        </div>
                        <div className="text-sm">
                          {formatPercent(Math.min(...commodities.map(c => c.ytdReturn)))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Most Volatile</div>
                        <div className="text-xl font-bold text-purple-600">Natural Gas</div>
                        <div className="text-sm">High weather sensitivity</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Total Volume</div>
                        <div className="text-xl font-bold text-blue-600">
                          {(commodities.reduce((sum, c) => sum + c.volume, 0) / 1000000000).toFixed(1)}B
                        </div>
                        <div className="text-sm">24h trading volume</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="detailed" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Detailed Commodity Analysis</h3>
                  <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {commodities.map(commodity => (
                        <SelectItem key={commodity.symbol} value={commodity.symbol}>
                          {commodity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCommodityData && (
                  <div className="space-y-6">
                    {/* Price Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{selectedCommodityData.name} Price Chart</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <Line
                            data={getCommodityPriceChart()}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                y: {
                                  beginAtZero: false
                                }
                              }
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Commodity Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Contract Specifications */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Contract Specifications</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Exchange</div>
                              <div className="font-medium">{selectedCommodityData.exchange}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Unit</div>
                              <div className="font-medium">{selectedCommodityData.unit}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Contract Size</div>
                              <div className="font-medium">{selectedCommodityData.specifications.contractSize}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Tick Size</div>
                              <div className="font-medium">{selectedCommodityData.specifications.tickSize}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Margin Requirement</div>
                              <div className="font-medium">${selectedCommodityData.specifications.marginRequirement.toLocaleString()}</div>
                            </div>
                            {selectedCommodityData.specifications.dailyLimit && (
                              <div>
                                <div className="text-muted-foreground">Daily Limit</div>
                                <div className="font-medium">${selectedCommodityData.specifications.dailyLimit}</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Technical Analysis */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Technical Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">RSI (14)</div>
                              <div className="font-medium">{selectedCommodityData.technicals.rsi.toFixed(1)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">MACD</div>
                              <div className={`font-medium ${selectedCommodityData.technicals.macd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {selectedCommodityData.technicals.macd.toFixed(3)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">50-day MA</div>
                              <div className="font-medium">{formatPrice(selectedCommodityData.technicals.movingAverage50, selectedCommodityData)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">200-day MA</div>
                              <div className="font-medium">{formatPrice(selectedCommodityData.technicals.movingAverage200, selectedCommodityData)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Support</div>
                              <div className="font-medium">{formatPrice(selectedCommodityData.technicals.support, selectedCommodityData)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Resistance</div>
                              <div className="font-medium">{formatPrice(selectedCommodityData.technicals.resistance, selectedCommodityData)}</div>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <div className="text-muted-foreground text-sm">Trend</div>
                            <Badge variant={
                              selectedCommodityData.technicals.trend === 'bullish' ? 'default' :
                              selectedCommodityData.technicals.trend === 'bearish' ? 'destructive' : 'secondary'
                            }>
                              {selectedCommodityData.technicals.trend.toUpperCase()}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Performance Metrics */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance & Risk Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 border rounded">
                            <div className="text-sm text-muted-foreground">Current Price</div>
                            <div className="text-xl font-bold">
                              {formatPrice(selectedCommodityData.price, selectedCommodityData)}
                            </div>
                          </div>
                          <div className="text-center p-3 border rounded">
                            <div className="text-sm text-muted-foreground">24h Change</div>
                            <div className={`text-xl font-bold ${selectedCommodityData.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(selectedCommodityData.changePercent24h)}
                            </div>
                          </div>
                          <div className="text-center p-3 border rounded">
                            <div className="text-sm text-muted-foreground">YTD Return</div>
                            <div className={`text-xl font-bold ${selectedCommodityData.ytdReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(selectedCommodityData.ytdReturn)}
                            </div>
                          </div>
                          <div className="text-center p-3 border rounded">
                            <div className="text-sm text-muted-foreground">52W Range</div>
                            <div className="text-lg font-medium">
                              {formatPrice(selectedCommodityData.low52w, selectedCommodityData)} - {formatPrice(selectedCommodityData.high52w, selectedCommodityData)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="fundamentals" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Fundamental Analysis</h3>
                  <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {commodities.map(commodity => (
                        <SelectItem key={commodity.symbol} value={commodity.symbol}>
                          {commodity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCommodityData && (
                  <div className="space-y-6">
                    {/* Supply & Demand */}
                    {selectedCommodityData.fundamentals.globalProduction && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Global Supply & Demand</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center p-4 border rounded">
                              <div className="text-sm text-muted-foreground">Production</div>
                              <div className="text-2xl font-bold text-blue-600">
                                {selectedCommodityData.fundamentals.globalProduction.toFixed(1)}M
                              </div>
                              <div className="text-sm">Million units annually</div>
                            </div>
                            <div className="text-center p-4 border rounded">
                              <div className="text-sm text-muted-foreground">Consumption</div>
                              <div className="text-2xl font-bold text-green-600">
                                {selectedCommodityData.fundamentals.consumption?.toFixed(1)}M
                              </div>
                              <div className="text-sm">Million units annually</div>
                            </div>
                            <div className="text-center p-4 border rounded">
                              <div className="text-sm text-muted-foreground">Inventories</div>
                              <div className="text-2xl font-bold text-purple-600">
                                {selectedCommodityData.fundamentals.inventories?.toFixed(1)}M
                              </div>
                              <div className="text-sm">Million units in storage</div>
                            </div>
                          </div>
                          
                          <div className="mt-4 p-4 bg-gray-50 rounded">
                            <div className="text-sm font-medium mb-2">Supply-Demand Balance</div>
                            <div className={`text-lg font-bold ${
                              (selectedCommodityData.fundamentals.globalProduction || 0) > (selectedCommodityData.fundamentals.consumption || 0)
                                ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {(selectedCommodityData.fundamentals.globalProduction || 0) > (selectedCommodityData.fundamentals.consumption || 0)
                                ? 'Surplus' : 'Deficit'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Risk Factors */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Risk Factors & Sensitivities</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 border rounded">
                            <div className="flex items-center gap-2 mb-2">
                              <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                              <span className="font-medium">Geopolitical Risk</span>
                            </div>
                            <Badge variant={
                              selectedCommodityData.fundamentals.geopoliticalRisk === 'high' ? 'destructive' :
                              selectedCommodityData.fundamentals.geopoliticalRisk === 'medium' ? 'default' : 'outline'
                            }>
                              {selectedCommodityData.fundamentals.geopoliticalRisk.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="p-4 border rounded">
                            <div className="flex items-center gap-2 mb-2">
                              <ClockIcon className="h-5 w-5 text-blue-500" />
                              <span className="font-medium">Seasonality</span>
                            </div>
                            <Badge variant={
                              selectedCommodityData.fundamentals.seasonality === 'high' ? 'destructive' :
                              selectedCommodityData.fundamentals.seasonality === 'medium' ? 'default' : 'outline'
                            }>
                              {selectedCommodityData.fundamentals.seasonality.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="p-4 border rounded">
                            <div className="flex items-center gap-2 mb-2">
                              <GlobeAltIcon className="h-5 w-5 text-green-500" />
                              <span className="font-medium">Weather Sensitive</span>
                            </div>
                            <Badge variant={selectedCommodityData.fundamentals.weatherSensitive ? 'destructive' : 'outline'}>
                              {selectedCommodityData.fundamentals.weatherSensitive ? 'YES' : 'NO'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Market Drivers */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Key Market Drivers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedCommodityData.category === 'energy' && [
                            'OPEC+ production decisions',
                            'US shale oil production',
                            'Global economic growth',
                            'Geopolitical tensions',
                            'Refinery capacity utilization'
                          ].map((driver, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded">
                              <BoltIcon className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">{driver}</span>
                            </div>
                          ))}
                          
                          {selectedCommodityData.category === 'agriculture' && [
                            'Weather conditions in key growing regions',
                            'Global crop production forecasts',
                            'Export policies and trade restrictions',
                            'Currency fluctuations',
                            'Biofuel demand and mandates'
                          ].map((driver, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded">
                              <SparklesIcon className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{driver}</span>
                            </div>
                          ))}
                          
                          {(selectedCommodityData.category === 'metals' || selectedCommodityData.category === 'precious_metals') && [
                            'Industrial demand from manufacturing',
                            'Infrastructure spending programs',
                            'Central bank monetary policies',
                            'Dollar strength and inflation expectations',
                            'Mine supply disruptions'
                          ].map((driver, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded">
                              <CubeIcon className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{driver}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="seasonal" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Seasonal Trading Patterns</h3>
                  <Badge variant="outline">Historical Analysis</Badge>
                </div>

                <div className="space-y-6">
                  {Object.entries(seasonalPatterns).map(([commodity, patterns]) => (
                    <Card key={commodity}>
                      <CardHeader>
                        <CardTitle>{commodity} Seasonal Patterns</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {patterns.map(pattern => (
                            <div key={pattern.month} className="p-4 border rounded">
                              <div className="text-center mb-3">
                                <div className="text-lg font-bold">{pattern.month}</div>
                                <div className={`text-2xl font-bold ${pattern.historicalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatPercent(pattern.historicalChange)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {(pattern.confidence * 100).toFixed(0)}% confidence
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Key Drivers:</div>
                                {pattern.drivers.map((driver, index) => (
                                  <div key={index} className="text-xs p-1 bg-gray-50 rounded">
                                    {driver}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Seasonal Trading Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle>Seasonal Trading Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Alert>
                        <InformationCircleIcon className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Energy:</strong> Natural gas typically shows strong seasonality with winter heating demand driving prices higher in Q4/Q1, while summer cooling demand creates secondary peaks.
                        </AlertDescription>
                      </Alert>
                      
                      <Alert>
                        <InformationCircleIcon className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Agriculture:</strong> Grain markets are heavily influenced by Northern Hemisphere planting (spring) and harvest (fall) seasons, with weather-related volatility peaking during critical growing periods.
                        </AlertDescription>
                      </Alert>
                      
                      <Alert>
                        <InformationCircleIcon className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Soft Commodities:</strong> Coffee and cocoa markets show seasonal patterns tied to harvest cycles in major producing regions, with frost risk premiums in Brazilian coffee during winter months.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="news" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Commodity Market News</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline">Live Updates</Badge>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="energy">Energy</SelectItem>
                        <SelectItem value="metals">Metals</SelectItem>
                        <SelectItem value="agriculture">Agriculture</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  {news
                    .filter(item => selectedCategory === 'all' || item.category === selectedCategory)
                    .map(item => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={
                                item.impact === 'high' ? 'destructive' :
                                item.impact === 'medium' ? 'default' : 'outline'
                              }>
                                {item.impact} impact
                              </Badge>
                              <Badge variant="outline">{item.commodity}</Badge>
                              {item.region && <Badge variant="outline">{item.region}</Badge>}
                            </div>
                            <h4 className="font-semibold mb-2">{item.headline}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{item.summary}</p>
                            <div className="text-xs text-muted-foreground">
                              {item.source} • {item.timestamp.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Market Sentiment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Market Sentiment Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-green-600">Bullish</div>
                        <div className="text-sm text-muted-foreground">Coffee, Gold</div>
                        <div className="text-xs">Supply concerns, safe haven</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-yellow-600">Neutral</div>
                        <div className="text-sm text-muted-foreground">Copper, Corn</div>
                        <div className="text-xs">Mixed fundamentals</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-red-600">Bearish</div>
                        <div className="text-sm text-muted-foreground">Natural Gas, Wheat</div>
                        <div className="text-xs">Oversupply, mild weather</div>
                      </div>
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