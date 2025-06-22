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
  GlobeAltIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  NewsIcon
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

interface MarketIndex {
  symbol: string
  name: string
  region: string
  country: string
  currency: string
  timezone: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  pe: number
  dividendYield: number
  high52w: number
  low52w: number
  ytdReturn: number
  isOpen: boolean
  nextOpen?: Date
  nextClose?: Date
  lastUpdate: Date
}

interface RegionData {
  id: string
  name: string
  flag: string
  timezone: string
  isOpen: boolean
  performance: {
    today: number
    week: number
    month: number
    quarter: number
    ytd: number
    year: number
  }
  indices: MarketIndex[]
  marketCap: number
  volume: number
  topSectors: Array<{
    name: string
    weight: number
    performance: number
  }>
  economicData: {
    gdpGrowth: number
    inflation: number
    unemployment: number
    interestRate: number
    currency: string
    currencyChange: number
  }
  news: Array<{
    id: string
    headline: string
    source: string
    timestamp: Date
    impact: 'high' | 'medium' | 'low'
  }>
}

interface MarketHours {
  region: string
  timezone: string
  preMarket?: { start: string; end: string }
  regular: { start: string; end: string }
  afterHours?: { start: string; end: string }
  isOpen: boolean
  nextOpen?: Date
  nextClose?: Date
}

const generateMockRegions = (): RegionData[] => [
  {
    id: 'north-america',
    name: 'North America',
    flag: '🇺🇸',
    timezone: 'America/New_York',
    isOpen: true,
    performance: {
      today: 1.2,
      week: 2.8,
      month: 4.5,
      quarter: 8.7,
      ytd: 15.3,
      year: 18.9
    },
    indices: [
      {
        symbol: 'SPX',
        name: 'S&P 500',
        region: 'North America',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/New_York',
        price: 4567.89,
        change: 52.34,
        changePercent: 1.16,
        volume: 3456789000,
        marketCap: 45670000000000,
        pe: 19.8,
        dividendYield: 1.6,
        high52w: 4607.07,
        low52w: 3491.58,
        ytdReturn: 15.3,
        isOpen: true,
        lastUpdate: new Date()
      },
      {
        symbol: 'IXIC',
        name: 'NASDAQ Composite',
        region: 'North America',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/New_York',
        price: 14256.78,
        change: 187.45,
        changePercent: 1.33,
        volume: 4567890000,
        marketCap: 23450000000000,
        pe: 26.4,
        dividendYield: 0.8,
        high52w: 14567.89,
        low52w: 10088.83,
        ytdReturn: 22.7,
        isOpen: true,
        lastUpdate: new Date()
      }
    ],
    marketCap: 69120000000000,
    volume: 8024679000,
    topSectors: [
      { name: 'Technology', weight: 28.5, performance: 2.1 },
      { name: 'Healthcare', weight: 13.2, performance: 0.8 },
      { name: 'Financials', weight: 12.8, performance: 1.5 },
      { name: 'Consumer Discretionary', weight: 10.9, performance: 1.8 },
      { name: 'Communication Services', weight: 8.7, performance: 1.2 }
    ],
    economicData: {
      gdpGrowth: 2.1,
      inflation: 3.2,
      unemployment: 3.7,
      interestRate: 5.25,
      currency: 'USD',
      currencyChange: 0.3
    },
    news: [
      {
        id: '1',
        headline: 'Federal Reserve signals potential rate pause amid economic data',
        source: 'Reuters',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        impact: 'high'
      },
      {
        id: '2',
        headline: 'Tech earnings exceed expectations driving market rally',
        source: 'Bloomberg',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        impact: 'medium'
      }
    ]
  },
  {
    id: 'europe',
    name: 'Europe',
    flag: '🇪🇺',
    timezone: 'Europe/London',
    isOpen: false,
    performance: {
      today: -0.4,
      week: 1.2,
      month: 2.8,
      quarter: 5.4,
      ytd: 8.9,
      year: 12.3
    },
    indices: [
      {
        symbol: 'UKX',
        name: 'FTSE 100',
        region: 'Europe',
        country: 'United Kingdom',
        currency: 'GBP',
        timezone: 'Europe/London',
        price: 7456.78,
        change: -23.45,
        changePercent: -0.31,
        volume: 1234567000,
        marketCap: 2340000000000,
        pe: 14.2,
        dividendYield: 3.8,
        high52w: 7903.50,
        low52w: 6707.62,
        ytdReturn: 6.8,
        isOpen: false,
        nextOpen: new Date(Date.now() + 8 * 60 * 60 * 1000),
        lastUpdate: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        symbol: 'SX5E',
        name: 'EURO STOXX 50',
        region: 'Europe',
        country: 'European Union',
        currency: 'EUR',
        timezone: 'Europe/Frankfurt',
        price: 4234.56,
        change: -18.92,
        changePercent: -0.44,
        volume: 987654000,
        marketCap: 3450000000000,
        pe: 13.7,
        dividendYield: 3.2,
        high52w: 4592.21,
        low52w: 3568.87,
        ytdReturn: 9.1,
        isOpen: false,
        nextOpen: new Date(Date.now() + 8 * 60 * 60 * 1000),
        lastUpdate: new Date(Date.now() - 6 * 60 * 60 * 1000)
      }
    ],
    marketCap: 5790000000000,
    volume: 2222221000,
    topSectors: [
      { name: 'Financials', weight: 18.9, performance: -0.2 },
      { name: 'Industrials', weight: 14.7, performance: 0.1 },
      { name: 'Technology', weight: 12.1, performance: -0.8 },
      { name: 'Healthcare', weight: 11.8, performance: 0.3 },
      { name: 'Consumer Discretionary', weight: 10.2, performance: -0.5 }
    ],
    economicData: {
      gdpGrowth: 1.5,
      inflation: 2.8,
      unemployment: 6.4,
      interestRate: 4.0,
      currency: 'EUR',
      currencyChange: -0.8
    },
    news: [
      {
        id: '3',
        headline: 'ECB maintains dovish stance on monetary policy',
        source: 'Financial Times',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        impact: 'high'
      },
      {
        id: '4',
        headline: 'European banks report strong quarterly results',
        source: 'Wall Street Journal',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        impact: 'medium'
      }
    ]
  },
  {
    id: 'asia-pacific',
    name: 'Asia Pacific',
    flag: '🇯🇵',
    timezone: 'Asia/Tokyo',
    isOpen: false,
    performance: {
      today: 0.8,
      week: 1.9,
      month: 3.4,
      quarter: 6.2,
      ytd: 11.7,
      year: 14.8
    },
    indices: [
      {
        symbol: 'NKY',
        name: 'Nikkei 225',
        region: 'Asia Pacific',
        country: 'Japan',
        currency: 'JPY',
        timezone: 'Asia/Tokyo',
        price: 32456.78,
        change: 267.89,
        changePercent: 0.83,
        volume: 2345678000,
        marketCap: 5670000000000,
        pe: 15.6,
        dividendYield: 2.1,
        high52w: 33753.33,
        low52w: 24717.53,
        ytdReturn: 13.2,
        isOpen: false,
        nextOpen: new Date(Date.now() + 2 * 60 * 60 * 1000),
        lastUpdate: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        symbol: 'HSI',
        name: 'Hang Seng Index',
        region: 'Asia Pacific',
        country: 'Hong Kong',
        currency: 'HKD',
        timezone: 'Asia/Hong_Kong',
        price: 17234.56,
        change: 145.78,
        changePercent: 0.85,
        volume: 1876543000,
        marketCap: 3890000000000,
        pe: 11.2,
        dividendYield: 3.5,
        high52w: 21842.72,
        low52w: 14687.02,
        ytdReturn: 8.9,
        isOpen: false,
        nextOpen: new Date(Date.now() + 1 * 60 * 60 * 1000),
        lastUpdate: new Date(Date.now() - 3 * 60 * 60 * 1000)
      }
    ],
    marketCap: 9560000000000,
    volume: 4222221000,
    topSectors: [
      { name: 'Technology', weight: 22.3, performance: 1.2 },
      { name: 'Financials', weight: 16.8, performance: 0.6 },
      { name: 'Industrials', weight: 13.4, performance: 0.9 },
      { name: 'Consumer Discretionary', weight: 12.1, performance: 0.4 },
      { name: 'Materials', weight: 8.9, performance: 1.1 }
    ],
    economicData: {
      gdpGrowth: 1.2,
      inflation: 2.6,
      unemployment: 2.8,
      interestRate: -0.1,
      currency: 'JPY',
      currencyChange: 1.2
    },
    news: [
      {
        id: '5',
        headline: 'Bank of Japan maintains ultra-loose monetary policy',
        source: 'Nikkei',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        impact: 'high'
      },
      {
        id: '6',
        headline: 'Chinese tech stocks rally on regulatory clarity',
        source: 'South China Morning Post',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        impact: 'medium'
      }
    ]
  },
  {
    id: 'emerging-markets',
    name: 'Emerging Markets',
    flag: '🌍',
    timezone: 'America/Sao_Paulo',
    isOpen: false,
    performance: {
      today: -1.2,
      week: 0.8,
      month: 2.1,
      quarter: 4.7,
      ytd: 6.8,
      year: 9.4
    },
    indices: [
      {
        symbol: 'IBOV',
        name: 'Bovespa Index',
        region: 'Emerging Markets',
        country: 'Brazil',
        currency: 'BRL',
        timezone: 'America/Sao_Paulo',
        price: 123456.78,
        change: -1456.89,
        changePercent: -1.17,
        volume: 987654000,
        marketCap: 1230000000000,
        pe: 12.8,
        dividendYield: 4.2,
        high52w: 134567.89,
        low52w: 98765.43,
        ytdReturn: 5.6,
        isOpen: false,
        nextOpen: new Date(Date.now() + 12 * 60 * 60 * 1000),
        lastUpdate: new Date(Date.now() - 8 * 60 * 60 * 1000)
      },
      {
        symbol: 'SENSEX',
        name: 'BSE Sensex',
        region: 'Emerging Markets',
        country: 'India',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        price: 65432.10,
        change: -289.45,
        changePercent: -0.44,
        volume: 2345678000,
        marketCap: 3450000000000,
        pe: 21.4,
        dividendYield: 1.4,
        high52w: 69296.14,
        low52w: 56147.32,
        ytdReturn: 11.8,
        isOpen: false,
        nextOpen: new Date(Date.now() + 3 * 60 * 60 * 1000),
        lastUpdate: new Date(Date.now() - 5 * 60 * 60 * 1000)
      }
    ],
    marketCap: 4680000000000,
    volume: 3333332000,
    topSectors: [
      { name: 'Financials', weight: 24.7, performance: -0.8 },
      { name: 'Materials', weight: 16.2, performance: -1.5 },
      { name: 'Energy', weight: 14.3, performance: -0.3 },
      { name: 'Technology', weight: 12.8, performance: -2.1 },
      { name: 'Consumer Staples', weight: 9.4, performance: 0.2 }
    ],
    economicData: {
      gdpGrowth: 5.2,
      inflation: 4.8,
      unemployment: 7.2,
      interestRate: 8.5,
      currency: 'Mixed',
      currencyChange: -1.8
    },
    news: [
      {
        id: '7',
        headline: 'Brazil central bank cuts interest rates amid economic slowdown',
        source: 'Reuters',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        impact: 'high'
      },
      {
        id: '8',
        headline: 'India sees strong foreign investment inflows in tech sector',
        source: 'Economic Times',
        timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000),
        impact: 'medium'
      }
    ]
  }
]

const generateMockMarketHours = (): MarketHours[] => [
  {
    region: 'North America',
    timezone: 'America/New_York',
    preMarket: { start: '04:00', end: '09:30' },
    regular: { start: '09:30', end: '16:00' },
    afterHours: { start: '16:00', end: '20:00' },
    isOpen: true,
    nextClose: new Date(Date.now() + 3 * 60 * 60 * 1000)
  },
  {
    region: 'Europe',
    timezone: 'Europe/London',
    regular: { start: '08:00', end: '16:30' },
    isOpen: false,
    nextOpen: new Date(Date.now() + 8 * 60 * 60 * 1000)
  },
  {
    region: 'Asia Pacific',
    timezone: 'Asia/Tokyo',
    regular: { start: '09:00', end: '15:00' },
    isOpen: false,
    nextOpen: new Date(Date.now() + 2 * 60 * 60 * 1000)
  }
]

export function RegionalMarkets() {
  const { performance } = usePerformanceMonitor('RegionalMarkets')
  const wsClient = useTradingWebSocket()
  const [regions, setRegions] = useState<RegionData[]>(generateMockRegions())
  const [marketHours, setMarketHours] = useState<MarketHours[]>(generateMockMarketHours())
  const [selectedRegion, setSelectedRegion] = useState<string>('north-america')
  const [timeframe, setTimeframe] = useState<string>('today')

  useEffect(() => {
    // Subscribe to regional market updates
    const handleRegionalUpdate = (data: any) => {
      if (data.type === 'market_update') {
        setRegions(prev => prev.map(region =>
          region.id === data.regionId ? { ...region, ...data.updates } : region
        ))
      } else if (data.type === 'index_update') {
        setRegions(prev => prev.map(region => ({
          ...region,
          indices: region.indices.map(index =>
            index.symbol === data.symbol ? { ...index, ...data.updates, lastUpdate: new Date() } : index
          )
        })))
      }
    }

    wsClient?.on('regional_updates', handleRegionalUpdate)

    // Simulate real-time updates
    const interval = setInterval(() => {
      setRegions(prev => prev.map(region => ({
        ...region,
        indices: region.indices.map(index => ({
          ...index,
          price: index.price + (Math.random() - 0.5) * index.price * 0.001,
          change: index.change + (Math.random() - 0.5) * 10,
          changePercent: index.changePercent + (Math.random() - 0.5) * 0.1,
          lastUpdate: new Date()
        }))
      })))
    }, 5000)

    return () => {
      wsClient?.off('regional_updates', handleRegionalUpdate)
      clearInterval(interval)
    }
  }, [wsClient])

  const getRegionalPerformanceChart = () => {
    const timeframes = ['today', 'week', 'month', 'quarter', 'ytd', 'year']
    
    return {
      labels: timeframes.map(t => t.toUpperCase()),
      datasets: regions.map((region, index) => ({
        label: region.name,
        data: timeframes.map(tf => region.performance[tf as keyof typeof region.performance]),
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)'
        ][index],
        backgroundColor: [
          'rgba(59, 130, 246, 0.1)',
          'rgba(16, 185, 129, 0.1)',
          'rgba(245, 158, 11, 0.1)',
          'rgba(239, 68, 68, 0.1)'
        ][index],
        fill: false,
        tension: 0.4
      }))
    }
  }

  const getMarketCapChart = () => ({
    labels: regions.map(r => r.name),
    datasets: [{
      data: regions.map(r => r.marketCap / 1000000000000), // Convert to trillions
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  })

  const formatCurrency = (value: number, currency?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const formatMarketCap = (value: number) => {
    if (value >= 1000000000000) {
      return `$${(value / 1000000000000).toFixed(1)}T`
    } else if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`
    } else {
      return `$${(value / 1000000).toFixed(1)}M`
    }
  }

  const getMarketStatus = (isOpen: boolean, nextOpen?: Date, nextClose?: Date) => {
    if (isOpen) {
      return {
        status: 'Open',
        color: 'text-green-600',
        badge: 'default',
        next: nextClose ? `Closes in ${Math.round((nextClose.getTime() - Date.now()) / (60 * 60 * 1000))}h` : ''
      }
    } else {
      return {
        status: 'Closed',
        color: 'text-red-600',
        badge: 'secondary',
        next: nextOpen ? `Opens in ${Math.round((nextOpen.getTime() - Date.now()) / (60 * 60 * 1000))}h` : ''
      }
    }
  }

  const selectedRegionData = regions.find(r => r.id === selectedRegion)

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GlobeAltIcon className="h-6 w-6" />
              Global Regional Markets Dashboard
            </CardTitle>
            <CardDescription>
              Monitor global markets, performance, and economic indicators across regions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Market Overview</TabsTrigger>
                <TabsTrigger value="regional">Regional Deep Dive</TabsTrigger>
                <TabsTrigger value="hours">Market Hours</TabsTrigger>
                <TabsTrigger value="economic">Economic Data</TabsTrigger>
                <TabsTrigger value="news">Market News</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Global Market Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {regions.map(region => {
                    const marketStatus = getMarketStatus(region.isOpen, 
                      region.indices[0]?.nextOpen, region.indices[0]?.nextClose)
                    
                    return (
                      <Card key={region.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{region.flag}</span>
                              <div>
                                <div className="font-medium">{region.name}</div>
                                <Badge variant={marketStatus.badge as any} className="text-xs">
                                  {marketStatus.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Today</span>
                              <span className={`font-medium ${region.performance.today >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercent(region.performance.today)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">YTD</span>
                              <span className={`font-medium ${region.performance.ytd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercent(region.performance.ytd)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Market Cap</span>
                              <span className="font-medium">{formatMarketCap(region.marketCap)}</span>
                            </div>
                          </div>
                          
                          {marketStatus.next && (
                            <div className="text-xs text-muted-foreground mt-2">
                              {marketStatus.next}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Global Performance Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Regional Performance Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <Line
                          data={getRegionalPerformanceChart()}
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

                  <Card>
                    <CardHeader>
                      <CardTitle>Market Capitalization by Region</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] flex items-center justify-center">
                        <Doughnut
                          data={getMarketCapChart()}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom'
                              },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    return `${context.label}: $${context.parsed}T`
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

                {/* Major Indices */}
                <Card>
                  <CardHeader>
                    <CardTitle>Major Global Indices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {regions.flatMap(region => region.indices).map(index => (
                          <div key={index.symbol} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium">{index.name} ({index.symbol})</div>
                                <div className="text-sm text-muted-foreground">
                                  {index.country} • {index.currency}
                                </div>
                              </div>
                              <Badge variant={index.isOpen ? 'default' : 'secondary'}>
                                {index.isOpen ? 'Open' : 'Closed'}
                              </Badge>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-mono text-lg">
                                {index.price.toLocaleString()}
                              </div>
                              <div className={`text-sm flex items-center gap-1 ${
                                index.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {index.changePercent >= 0 ? 
                                  <TrendingUpIcon className="h-3 w-3" /> : 
                                  <TrendingDownIcon className="h-3 w-3" />
                                }
                                {formatPercent(index.changePercent)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="regional" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Regional Market Analysis</h3>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map(region => (
                        <SelectItem key={region.id} value={region.id}>
                          <div className="flex items-center gap-2">
                            <span>{region.flag}</span>
                            <span>{region.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRegionData && (
                  <div className="space-y-6">
                    {/* Region Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-2xl">{selectedRegionData.flag}</span>
                          {selectedRegionData.name} Market Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 border rounded">
                            <div className="text-sm text-muted-foreground">Market Status</div>
                            <div className={`text-lg font-bold ${selectedRegionData.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedRegionData.isOpen ? 'Open' : 'Closed'}
                            </div>
                          </div>
                          <div className="text-center p-3 border rounded">
                            <div className="text-sm text-muted-foreground">Today Performance</div>
                            <div className={`text-lg font-bold ${selectedRegionData.performance.today >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(selectedRegionData.performance.today)}
                            </div>
                          </div>
                          <div className="text-center p-3 border rounded">
                            <div className="text-sm text-muted-foreground">YTD Return</div>
                            <div className={`text-lg font-bold ${selectedRegionData.performance.ytd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(selectedRegionData.performance.ytd)}
                            </div>
                          </div>
                          <div className="text-center p-3 border rounded">
                            <div className="text-sm text-muted-foreground">Market Cap</div>
                            <div className="text-lg font-bold text-blue-600">
                              {formatMarketCap(selectedRegionData.marketCap)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Regional Indices */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Regional Indices</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedRegionData.indices.map(index => (
                            <div key={index.symbol} className="p-4 border rounded">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold">{index.name}</h4>
                                  <p className="text-sm text-muted-foreground">{index.symbol}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold">{index.price.toLocaleString()}</div>
                                  <div className={`text-sm ${index.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPercent(index.changePercent)} ({index.change >= 0 ? '+' : ''}{index.change.toFixed(2)})
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
                                <div>
                                  <div className="text-muted-foreground">P/E Ratio</div>
                                  <div className="font-medium">{index.pe.toFixed(1)}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Dividend Yield</div>
                                  <div className="font-medium">{index.dividendYield.toFixed(1)}%</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">52W High</div>
                                  <div className="font-medium">{index.high52w.toLocaleString()}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">52W Low</div>
                                  <div className="font-medium">{index.low52w.toLocaleString()}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">YTD Return</div>
                                  <div className={`font-medium ${index.ytdReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPercent(index.ytdReturn)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Volume</div>
                                  <div className="font-medium">{(index.volume / 1000000).toFixed(1)}M</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sector Performance */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Sectors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedRegionData.topSectors.map(sector => (
                            <div key={sector.name} className="flex items-center justify-between p-3 border rounded">
                              <div className="flex-1">
                                <div className="font-medium">{sector.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {sector.weight.toFixed(1)}% of index
                                </div>
                              </div>
                              <div className={`font-medium ${sector.performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercent(sector.performance)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="hours" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Global Market Hours</h3>
                  <div className="text-sm text-muted-foreground">
                    Current time: {new Date().toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketHours.map(market => (
                    <Card key={market.region}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ClockIcon className="h-5 w-5" />
                          {market.region}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge variant={market.isOpen ? 'default' : 'secondary'}>
                            {market.isOpen ? 'Open' : 'Closed'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          {market.preMarket && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pre-market</span>
                              <span>{market.preMarket.start} - {market.preMarket.end}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Regular</span>
                            <span className="font-medium">{market.regular.start} - {market.regular.end}</span>
                          </div>
                          {market.afterHours && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">After-hours</span>
                              <span>{market.afterHours.start} - {market.afterHours.end}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          Timezone: {market.timezone}
                        </div>
                        
                        {market.nextOpen && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Next open: </span>
                            <span className="font-medium">{market.nextOpen.toLocaleString()}</span>
                          </div>
                        )}
                        
                        {market.nextClose && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Next close: </span>
                            <span className="font-medium">{market.nextClose.toLocaleString()}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Market Hours Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>24-Hour Global Trading Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="h-32 bg-gradient-to-r from-blue-50 to-purple-50 rounded flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">
                          Interactive 24-hour market timeline visualization
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>The global markets provide nearly 24-hour trading coverage:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Asia Pacific markets open first (Tokyo, Hong Kong, Sydney)</li>
                          <li>European markets follow (London, Frankfurt, Paris)</li>
                          <li>North American markets complete the cycle (New York, Toronto)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="economic" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Regional Economic Indicators</h3>
                  <Badge variant="outline">
                    Last updated: {new Date().toLocaleDateString()}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {regions.map(region => (
                    <Card key={region.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-xl">{region.flag}</span>
                          {region.name} Economic Data
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">GDP Growth</div>
                            <div className={`text-xl font-bold ${region.economicData.gdpGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {region.economicData.gdpGrowth >= 0 ? '+' : ''}{region.economicData.gdpGrowth.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Inflation</div>
                            <div className="text-xl font-bold text-orange-600">
                              {region.economicData.inflation.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Unemployment</div>
                            <div className="text-xl font-bold text-purple-600">
                              {region.economicData.unemployment.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Interest Rate</div>
                            <div className="text-xl font-bold text-blue-600">
                              {region.economicData.interestRate.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Currency Impact</span>
                            <div className={`text-sm font-medium ${region.economicData.currencyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {region.economicData.currencyChange >= 0 ? '+' : ''}{region.economicData.currencyChange.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Economic Calendar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      Upcoming Economic Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), event: 'US GDP (Q4)', region: 'North America', impact: 'High' },
                        { date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), event: 'ECB Interest Rate Decision', region: 'Europe', impact: 'High' },
                        { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), event: 'Japan CPI Data', region: 'Asia Pacific', impact: 'Medium' },
                        { date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), event: 'Brazil Employment Data', region: 'Emerging Markets', impact: 'Medium' }
                      ].map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">{event.event}</div>
                              <div className="text-sm text-muted-foreground">
                                {event.date.toLocaleDateString()} • {event.region}
                              </div>
                            </div>
                          </div>
                          <Badge variant={event.impact === 'High' ? 'destructive' : 'default'}>
                            {event.impact} Impact
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="news" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Regional Market News</h3>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {regions.map(region => (
                        <SelectItem key={region.id} value={region.id}>
                          <div className="flex items-center gap-2">
                            <span>{region.flag}</span>
                            <span>{region.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  {(selectedRegion === 'all' ? 
                    regions.flatMap(r => r.news.map(n => ({ ...n, region: r.name, flag: r.flag }))) :
                    selectedRegionData?.news.map(n => ({ ...n, region: selectedRegionData.name, flag: selectedRegionData.flag })) || []
                  )
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .map(newsItem => (
                    <Card key={newsItem.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {selectedRegion === 'all' && (
                                <span className="text-lg">{newsItem.flag}</span>
                              )}
                              <Badge variant={
                                newsItem.impact === 'high' ? 'destructive' :
                                newsItem.impact === 'medium' ? 'default' : 'outline'
                              }>
                                {newsItem.impact} impact
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {newsItem.source}
                              </span>
                            </div>
                            <h4 className="font-semibold mb-2">{newsItem.headline}</h4>
                            <div className="text-sm text-muted-foreground">
                              {newsItem.timestamp.toLocaleString()}
                              {selectedRegion === 'all' && ` • ${newsItem.region}`}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* News Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Market Sentiment Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-green-600">Bullish</div>
                        <div className="text-sm text-muted-foreground">North America Tech</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-yellow-600">Neutral</div>
                        <div className="text-sm text-muted-foreground">European Banks</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-red-600">Bearish</div>
                        <div className="text-sm text-muted-foreground">EM Currencies</div>
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