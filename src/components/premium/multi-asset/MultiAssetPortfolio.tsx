'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  GlobeAltIcon,
  CurrencyDollarIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  ArrowsUpDownIcon,
  BanknotesIcon
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
import { Doughnut, Bar, Line } from 'react-chartjs-2'

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

interface AssetClass {
  id: string
  name: string
  category: 'equities' | 'bonds' | 'commodities' | 'crypto' | 'forex' | 'reits' | 'alternatives'
  region: 'US' | 'EU' | 'APAC' | 'EM' | 'Global'
  currency: string
  allocation: number
  targetAllocation: number
  value: number
  dayChange: number
  dayChangePercent: number
  ytdReturn: number
  volatility: number
  sharpeRatio: number
  beta: number
  correlation: number
  liquidity: 'high' | 'medium' | 'low'
  esgScore?: number
  expense: number
  holdings: AssetHolding[]
}

interface AssetHolding {
  symbol: string
  name: string
  quantity: number
  price: number
  value: number
  weight: number
  currency: string
  exchange: string
  sector?: string
  country?: string
  dayChange: number
  dayChangePercent: number
}

interface CurrencyExposure {
  currency: string
  exposure: number
  hedged: number
  unhedged: number
  dayChange: number
}

interface RegionalExposure {
  region: string
  allocation: number
  performance: number
  count: number
}

const generateMockAssetClasses = (): AssetClass[] => [
  {
    id: 'us-equities',
    name: 'US Large Cap Equities',
    category: 'equities',
    region: 'US',
    currency: 'USD',
    allocation: 35.5,
    targetAllocation: 40.0,
    value: 3550000,
    dayChange: 45600,
    dayChangePercent: 1.3,
    ytdReturn: 12.4,
    volatility: 16.2,
    sharpeRatio: 0.89,
    beta: 1.02,
    correlation: 1.0,
    liquidity: 'high',
    esgScore: 7.8,
    expense: 0.03,
    holdings: [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        quantity: 2500,
        price: 185.50,
        value: 463750,
        weight: 13.1,
        currency: 'USD',
        exchange: 'NASDAQ',
        sector: 'Technology',
        country: 'US',
        dayChange: 3.25,
        dayChangePercent: 1.8
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        quantity: 1200,
        price: 378.20,
        value: 453840,
        weight: 12.8,
        currency: 'USD',
        exchange: 'NASDAQ',
        sector: 'Technology',
        country: 'US',
        dayChange: 4.80,
        dayChangePercent: 1.3
      },
      {
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        quantity: 800,
        price: 156.80,
        value: 125440,
        weight: 3.5,
        currency: 'USD',
        exchange: 'NASDAQ',
        sector: 'Consumer Discretionary',
        country: 'US',
        dayChange: -1.20,
        dayChangePercent: -0.8
      }
    ]
  },
  {
    id: 'intl-equities',
    name: 'International Developed Equities',
    category: 'equities',
    region: 'EU',
    currency: 'EUR',
    allocation: 20.3,
    targetAllocation: 25.0,
    value: 2030000,
    dayChange: -8100,
    dayChangePercent: -0.4,
    ytdReturn: 8.7,
    volatility: 18.5,
    sharpeRatio: 0.65,
    beta: 0.88,
    correlation: 0.78,
    liquidity: 'high',
    esgScore: 8.2,
    expense: 0.08,
    holdings: [
      {
        symbol: 'ASML.AS',
        name: 'ASML Holding NV',
        quantity: 400,
        price: 625.30,
        value: 250120,
        weight: 12.3,
        currency: 'EUR',
        exchange: 'Euronext',
        sector: 'Technology',
        country: 'Netherlands',
        dayChange: -8.40,
        dayChangePercent: -1.3
      }
    ]
  },
  {
    id: 'bonds',
    name: 'Aggregate Bonds',
    category: 'bonds',
    region: 'US',
    currency: 'USD',
    allocation: 25.0,
    targetAllocation: 20.0,
    value: 2500000,
    dayChange: 12500,
    dayChangePercent: 0.5,
    ytdReturn: -2.1,
    volatility: 4.2,
    sharpeRatio: -0.12,
    beta: -0.25,
    correlation: -0.15,
    liquidity: 'high',
    expense: 0.05,
    holdings: [
      {
        symbol: 'AGG',
        name: 'iShares Core US Aggregate Bond ETF',
        quantity: 25000,
        price: 100.0,
        value: 2500000,
        weight: 100.0,
        currency: 'USD',
        exchange: 'NYSE',
        dayChange: 0.50,
        dayChangePercent: 0.5
      }
    ]
  },
  {
    id: 'emerging-markets',
    name: 'Emerging Markets',
    category: 'equities',
    region: 'EM',
    currency: 'USD',
    allocation: 8.2,
    targetAllocation: 10.0,
    value: 820000,
    dayChange: -16400,
    dayChangePercent: -2.0,
    ytdReturn: -5.3,
    volatility: 24.1,
    sharpeRatio: -0.18,
    beta: 1.15,
    correlation: 0.65,
    liquidity: 'medium',
    esgScore: 6.1,
    expense: 0.18,
    holdings: [
      {
        symbol: 'EEM',
        name: 'iShares MSCI Emerging Markets ETF',
        quantity: 20000,
        price: 41.0,
        value: 820000,
        weight: 100.0,
        currency: 'USD',
        exchange: 'NYSE',
        dayChange: -0.82,
        dayChangePercent: -2.0
      }
    ]
  },
  {
    id: 'commodities',
    name: 'Commodities',
    category: 'commodities',
    region: 'Global',
    currency: 'USD',
    allocation: 6.0,
    targetAllocation: 5.0,
    value: 600000,
    dayChange: 18000,
    dayChangePercent: 3.0,
    ytdReturn: 15.2,
    volatility: 28.5,
    sharpeRatio: 0.42,
    beta: 0.35,
    correlation: 0.22,
    liquidity: 'medium',
    expense: 0.20,
    holdings: [
      {
        symbol: 'GLD',
        name: 'SPDR Gold Trust',
        quantity: 1500,
        price: 200.0,
        value: 300000,
        weight: 50.0,
        currency: 'USD',
        exchange: 'NYSE',
        dayChange: 6.0,
        dayChangePercent: 3.1
      },
      {
        symbol: 'USO',
        name: 'United States Oil Fund',
        quantity: 4000,
        price: 75.0,
        value: 300000,
        weight: 50.0,
        currency: 'USD',
        exchange: 'NYSE',
        dayChange: 2.25,
        dayChangePercent: 3.1
      }
    ]
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    category: 'crypto',
    region: 'Global',
    currency: 'USD',
    allocation: 5.0,
    targetAllocation: 5.0,
    value: 500000,
    dayChange: -25000,
    dayChangePercent: -5.0,
    ytdReturn: 45.8,
    volatility: 65.2,
    sharpeRatio: 0.58,
    beta: 0.85,
    correlation: 0.12,
    liquidity: 'high',
    expense: 0.25,
    holdings: [
      {
        symbol: 'BTC-USD',
        name: 'Bitcoin',
        quantity: 12.5,
        price: 32000,
        value: 400000,
        weight: 80.0,
        currency: 'USD',
        exchange: 'Coinbase',
        dayChange: -1600,
        dayChangePercent: -4.8
      },
      {
        symbol: 'ETH-USD',
        name: 'Ethereum',
        quantity: 50,
        price: 2000,
        value: 100000,
        weight: 20.0,
        currency: 'USD',
        exchange: 'Coinbase',
        dayChange: -120,
        dayChangePercent: -5.7
      }
    ]
  }
]

const generateMockCurrencyExposure = (): CurrencyExposure[] => [
  { currency: 'USD', exposure: 75.2, hedged: 15.0, unhedged: 60.2, dayChange: 0.3 },
  { currency: 'EUR', exposure: 12.5, hedged: 8.0, unhedged: 4.5, dayChange: -0.8 },
  { currency: 'JPY', exposure: 5.8, hedged: 3.0, unhedged: 2.8, dayChange: 1.2 },
  { currency: 'GBP', exposure: 4.2, hedged: 2.0, unhedged: 2.2, dayChange: -0.5 },
  { currency: 'CHF', exposure: 2.3, hedged: 1.5, unhedged: 0.8, dayChange: 0.1 }
]

const generateMockRegionalExposure = (): RegionalExposure[] => [
  { region: 'North America', allocation: 65.5, performance: 1.2, count: 245 },
  { region: 'Europe', allocation: 18.3, performance: -0.4, count: 87 },
  { region: 'Asia Pacific', allocation: 12.8, performance: 0.8, count: 124 },
  { region: 'Emerging Markets', allocation: 3.4, performance: -1.8, count: 67 }
]

export function MultiAssetPortfolio() {
  const { performance } = usePerformanceMonitor('MultiAssetPortfolio')
  const wsClient = useTradingWebSocket()
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>(generateMockAssetClasses())
  const [currencyExposure, setCurrencyExposure] = useState<CurrencyExposure[]>(generateMockCurrencyExposure())
  const [regionalExposure, setRegionalExposure] = useState<RegionalExposure[]>(generateMockRegionalExposure())
  const [selectedAssetClass, setSelectedAssetClass] = useState<AssetClass | null>(null)
  const [viewMode, setViewMode] = useState<'allocation' | 'performance' | 'risk'>('allocation')
  const [rebalanceMode, setRebalanceMode] = useState(false)

  const totalValue = assetClasses.reduce((sum, asset) => sum + asset.value, 0)
  const totalDayChange = assetClasses.reduce((sum, asset) => sum + asset.dayChange, 0)
  const totalDayChangePercent = (totalDayChange / totalValue) * 100

  useEffect(() => {
    // Subscribe to multi-asset updates
    const handleMultiAssetUpdate = (data: any) => {
      if (data.type === 'asset_price_update') {
        setAssetClasses(prev => prev.map(asset =>
          asset.id === data.assetId ? { ...asset, ...data.updates } : asset
        ))
      } else if (data.type === 'currency_update') {
        setCurrencyExposure(prev => prev.map(currency =>
          currency.currency === data.currency ? { ...currency, ...data.updates } : currency
        ))
      }
    }

    wsClient?.on('multi_asset_updates', handleMultiAssetUpdate)

    // Simulate real-time updates
    const interval = setInterval(() => {
      setAssetClasses(prev => prev.map(asset => ({
        ...asset,
        dayChange: asset.dayChange + (Math.random() - 0.5) * 1000,
        dayChangePercent: asset.dayChangePercent + (Math.random() - 0.5) * 0.1
      })))
    }, 5000)

    return () => {
      wsClient?.off('multi_asset_updates', handleMultiAssetUpdate)
      clearInterval(interval)
    }
  }, [wsClient])

  const getAllocationChartData = () => ({
    labels: assetClasses.map(asset => asset.name),
    datasets: [{
      data: assetClasses.map(asset => asset.allocation),
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
        '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
      ],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  })

  const getPerformanceChartData = () => ({
    labels: assetClasses.map(asset => asset.name),
    datasets: [{
      label: 'YTD Return (%)',
      data: assetClasses.map(asset => asset.ytdReturn),
      backgroundColor: assetClasses.map(asset => 
        asset.ytdReturn >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'
      ),
      borderColor: assetClasses.map(asset => 
        asset.ytdReturn >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'
      ),
      borderWidth: 1
    }]
  })

  const getRiskReturnData = () => ({
    datasets: [{
      label: 'Asset Classes',
      data: assetClasses.map(asset => ({
        x: asset.volatility,
        y: asset.ytdReturn,
        r: asset.allocation / 2
      })),
      backgroundColor: assetClasses.map((_, idx) => 
        `rgba(${59 + idx * 40}, ${130 + idx * 20}, ${246 - idx * 30}, 0.6)`
      )
    }]
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GlobeAltIcon className="h-6 w-6" />
              Multi-Asset Portfolio Management
            </CardTitle>
            <CardDescription>
              Comprehensive view and management of global multi-asset portfolio allocation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Portfolio Overview</TabsTrigger>
                <TabsTrigger value="allocation">Asset Allocation</TabsTrigger>
                <TabsTrigger value="exposure">Currency & Regional</TabsTrigger>
                <TabsTrigger value="holdings">Holdings Detail</TabsTrigger>
                <TabsTrigger value="rebalance">Rebalancing</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Portfolio Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Value</p>
                          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                          <p className={`text-sm ${totalDayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(totalDayChangePercent)} today
                          </p>
                        </div>
                        <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Asset Classes</p>
                          <p className="text-2xl font-bold">{assetClasses.length}</p>
                          <p className="text-sm text-muted-foreground">
                            {assetClasses.reduce((sum, asset) => sum + asset.holdings.length, 0)} holdings
                          </p>
                        </div>
                        <BuildingLibraryIcon className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Portfolio Beta</p>
                          <p className="text-2xl font-bold">
                            {(assetClasses.reduce((sum, asset) => sum + asset.beta * asset.allocation, 0) / 100).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">vs market</p>
                        </div>
                        <ChartBarIcon className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                          <p className="text-2xl font-bold">
                            {(assetClasses.reduce((sum, asset) => sum + asset.sharpeRatio * asset.allocation, 0) / 100).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">risk-adjusted</p>
                        </div>
                        <ScaleIcon className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Overview Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Asset Allocation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] flex items-center justify-center">
                        <Doughnut 
                          data={getAllocationChartData()}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom'
                              }
                            }
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>YTD Performance by Asset Class</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <Bar
                          data={getPerformanceChartData()}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
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
                </div>

                {/* Asset Class Performance Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Asset Class Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {assetClasses.map(asset => (
                          <div key={asset.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{asset.name}</h4>
                                <Badge variant="outline">{asset.category}</Badge>
                                <Badge variant="outline">{asset.region}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {asset.holdings.length} holdings • {asset.currency}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4 text-right text-sm">
                              <div>
                                <div className="font-medium">{formatCurrency(asset.value)}</div>
                                <div className="text-muted-foreground">{asset.allocation.toFixed(1)}%</div>
                              </div>
                              <div className={asset.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                                <div className="font-medium">{formatCurrency(asset.dayChange)}</div>
                                <div>{formatPercent(asset.dayChangePercent)}</div>
                              </div>
                              <div className={asset.ytdReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                                <div className="font-medium">{formatPercent(asset.ytdReturn)}</div>
                                <div className="text-muted-foreground">YTD</div>
                              </div>
                              <div>
                                <div className="font-medium">{asset.volatility.toFixed(1)}%</div>
                                <div className="text-muted-foreground">Vol</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="allocation" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Asset Allocation Analysis</h3>
                  <div className="flex gap-2">
                    <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allocation">Allocation</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="risk">Risk/Return</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Current vs Target Allocation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {assetClasses.map(asset => {
                          const difference = asset.allocation - asset.targetAllocation
                          return (
                            <div key={asset.id} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{asset.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{asset.allocation.toFixed(1)}%</span>
                                  <span className="text-xs text-muted-foreground">
                                    (target: {asset.targetAllocation.toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Progress value={asset.allocation} className="h-2" />
                                </div>
                                <div className={`text-xs font-medium ${
                                  Math.abs(difference) > 2 ? 'text-red-600' : 
                                  Math.abs(difference) > 1 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                  {difference >= 0 ? '+' : ''}{difference.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Risk-Return Scatter</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 rounded flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">
                            Risk-Return Analysis Chart
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Allocation Drift Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Allocation Drift Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {assetClasses.map(asset => {
                        const drift = asset.allocation - asset.targetAllocation
                        const driftSeverity = Math.abs(drift) > 5 ? 'high' : Math.abs(drift) > 2 ? 'medium' : 'low'
                        
                        return (
                          <div key={asset.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                driftSeverity === 'high' ? 'bg-red-500' :
                                driftSeverity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                              }`}></div>
                              <div>
                                <div className="font-medium">{asset.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  Current: {asset.allocation.toFixed(1)}% | Target: {asset.targetAllocation.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${drift >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                {drift >= 0 ? '+' : ''}{drift.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(Math.abs(drift / 100 * totalValue))} to rebalance
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="exposure" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Currency Exposure */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BanknotesIcon className="h-5 w-5" />
                        Currency Exposure
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {currencyExposure.map(currency => (
                          <div key={currency.currency} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{currency.currency}</span>
                                <Badge variant="outline">{currency.exposure.toFixed(1)}%</Badge>
                              </div>
                              <div className={`text-sm font-medium ${
                                currency.dayChange >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatPercent(currency.dayChange)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Hedged: {currency.hedged.toFixed(1)}%</span>
                                <span>Unhedged: {currency.unhedged.toFixed(1)}%</span>
                              </div>
                              <div className="flex gap-1 h-2">
                                <div 
                                  className="bg-blue-500 rounded-l"
                                  style={{ width: `${(currency.hedged / currency.exposure) * 100}%` }}
                                ></div>
                                <div 
                                  className="bg-blue-200 rounded-r"
                                  style={{ width: `${(currency.unhedged / currency.exposure) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Regional Exposure */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GlobeAltIcon className="h-5 w-5" />
                        Regional Exposure
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {regionalExposure.map(region => (
                          <div key={region.region} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex-1">
                              <div className="font-medium">{region.region}</div>
                              <div className="text-sm text-muted-foreground">
                                {region.count} holdings
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{region.allocation.toFixed(1)}%</div>
                              <div className={`text-sm ${
                                region.performance >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatPercent(region.performance)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sector Allocation */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sector Allocation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary', 'Industrials', 'Energy', 'Materials', 'Utilities'].map(sector => (
                        <div key={sector} className="text-center p-3 border rounded">
                          <div className="font-medium text-sm">{sector}</div>
                          <div className="text-lg font-bold text-blue-600">
                            {(Math.random() * 20).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.floor(Math.random() * 50) + 10} holdings
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="holdings" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Holdings Detail</h3>
                  <Select value={selectedAssetClass?.id || 'all'} onValueChange={(value) => {
                    setSelectedAssetClass(value === 'all' ? null : assetClasses.find(a => a.id === value) || null)
                  }}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by asset class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Asset Classes</SelectItem>
                      {assetClasses.map(asset => (
                        <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-4 p-4">
                        {(selectedAssetClass ? [selectedAssetClass] : assetClasses).map(assetClass => (
                          <div key={assetClass.id} className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div>
                                <h4 className="font-semibold">{assetClass.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {assetClass.holdings.length} holdings • {formatCurrency(assetClass.value)}
                                </p>
                              </div>
                              <Badge variant="outline">{assetClass.allocation.toFixed(1)}%</Badge>
                            </div>
                            
                            <div className="space-y-2">
                              {assetClass.holdings.map(holding => (
                                <div key={holding.symbol} className="flex items-center justify-between p-3 border rounded">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{holding.symbol}</span>
                                      <span className="text-sm text-muted-foreground">{holding.name}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {holding.quantity.toLocaleString()} shares • {holding.exchange}
                                      {holding.sector && ` • ${holding.sector}`}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-4 text-right text-sm">
                                    <div>
                                      <div className="font-medium">{formatCurrency(holding.price)}</div>
                                      <div className="text-muted-foreground">Price</div>
                                    </div>
                                    <div>
                                      <div className="font-medium">{formatCurrency(holding.value)}</div>
                                      <div className="text-muted-foreground">{holding.weight.toFixed(1)}%</div>
                                    </div>
                                    <div className={holding.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                                      <div className="font-medium">{formatPercent(holding.dayChangePercent)}</div>
                                      <div>{formatCurrency(holding.dayChange)}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rebalance" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Portfolio Rebalancing</h3>
                  <Button onClick={() => setRebalanceMode(!rebalanceMode)}>
                    <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                    {rebalanceMode ? 'Exit Rebalance Mode' : 'Enter Rebalance Mode'}
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Rebalancing Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {assetClasses.map(asset => {
                        const drift = asset.allocation - asset.targetAllocation
                        const rebalanceAmount = (drift / 100) * totalValue
                        
                        return (
                          <div key={asset.id} className="flex items-center justify-between p-4 border rounded">
                            <div className="flex-1">
                              <div className="font-medium">{asset.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Current: {asset.allocation.toFixed(1)}% | Target: {asset.targetAllocation.toFixed(1)}%
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className={`font-medium ${Math.abs(drift) > 2 ? 'text-red-600' : 'text-green-600'}`}>
                                {drift >= 0 ? 'SELL' : 'BUY'}
                              </div>
                              <div className="text-sm">
                                {formatCurrency(Math.abs(rebalanceAmount))}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className={`font-medium ${drift >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {drift >= 0 ? '-' : '+'}{Math.abs(drift).toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {Math.abs(drift) > 5 ? 'High Priority' : 
                                 Math.abs(drift) > 2 ? 'Medium Priority' : 'Low Priority'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 rounded">
                      <h4 className="font-medium mb-2">Rebalancing Summary</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Total Trades</div>
                          <div className="font-medium">{assetClasses.filter(a => Math.abs(a.allocation - a.targetAllocation) > 1).length}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Estimated Cost</div>
                          <div className="font-medium">{formatCurrency(1250)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Tax Impact</div>
                          <div className="font-medium">{formatCurrency(8500)}</div>
                        </div>
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