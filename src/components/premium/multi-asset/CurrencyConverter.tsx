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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalendarIcon,
  BanknotesIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface CurrencyRate {
  pair: string
  rate: number
  bid: number
  ask: number
  spread: number
  change24h: number
  changePercent24h: number
  high24h: number
  low24h: number
  volume24h: number
  lastUpdate: Date
  volatility: number
}

interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  country: string
  flag: string
  centralBank: string
  interestRate: number
  inflation: number
  gdp: number
  lastMeeting?: Date
  nextMeeting?: Date
}

interface CrossRate {
  base: string
  quote: string
  rate: number
  inverse: number
  spread: number
  change: number
}

interface HistoricalRate {
  timestamp: Date
  rate: number
  volume?: number
}

const supportedCurrencies: CurrencyInfo[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    country: 'United States',
    flag: '🇺🇸',
    centralBank: 'Federal Reserve',
    interestRate: 5.25,
    inflation: 3.2,
    gdp: 2.1,
    lastMeeting: new Date('2024-01-31'),
    nextMeeting: new Date('2024-03-20')
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    country: 'European Union',
    flag: '🇪🇺',
    centralBank: 'European Central Bank',
    interestRate: 4.0,
    inflation: 2.8,
    gdp: 1.5,
    lastMeeting: new Date('2024-01-25'),
    nextMeeting: new Date('2024-03-07')
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    country: 'United Kingdom',
    flag: '🇬🇧',
    centralBank: 'Bank of England',
    interestRate: 5.25,
    inflation: 4.0,
    gdp: 0.8,
    lastMeeting: new Date('2024-02-01'),
    nextMeeting: new Date('2024-03-21')
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    country: 'Japan',
    flag: '🇯🇵',
    centralBank: 'Bank of Japan',
    interestRate: -0.1,
    inflation: 2.6,
    gdp: 1.2,
    lastMeeting: new Date('2024-01-23'),
    nextMeeting: new Date('2024-03-19')
  },
  {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    country: 'Switzerland',
    flag: '🇨🇭',
    centralBank: 'Swiss National Bank',
    interestRate: 1.75,
    inflation: 1.4,
    gdp: 0.9,
    lastMeeting: new Date('2024-01-15'),
    nextMeeting: new Date('2024-03-21')
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    country: 'Canada',
    flag: '🇨🇦',
    centralBank: 'Bank of Canada',
    interestRate: 5.0,
    inflation: 2.9,
    gdp: 1.8,
    lastMeeting: new Date('2024-01-24'),
    nextMeeting: new Date('2024-03-06')
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    country: 'Australia',
    flag: '🇦🇺',
    centralBank: 'Reserve Bank of Australia',
    interestRate: 4.35,
    inflation: 3.4,
    gdp: 2.0,
    lastMeeting: new Date('2024-02-06'),
    nextMeeting: new Date('2024-03-19')
  },
  {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    country: 'China',
    flag: '🇨🇳',
    centralBank: 'People\'s Bank of China',
    interestRate: 3.45,
    inflation: 0.2,
    gdp: 5.2,
    lastMeeting: new Date('2024-01-24'),
    nextMeeting: new Date('2024-03-15')
  }
]

const generateMockRates = (): CurrencyRate[] => [
  {
    pair: 'EUR/USD',
    rate: 1.0847,
    bid: 1.0845,
    ask: 1.0849,
    spread: 0.0004,
    change24h: 0.0023,
    changePercent24h: 0.21,
    high24h: 1.0865,
    low24h: 1.0821,
    volume24h: 156789000,
    lastUpdate: new Date(),
    volatility: 12.5
  },
  {
    pair: 'GBP/USD',
    rate: 1.2678,
    bid: 1.2675,
    ask: 1.2681,
    spread: 0.0006,
    change24h: -0.0034,
    changePercent24h: -0.27,
    high24h: 1.2721,
    low24h: 1.2651,
    volume24h: 89456000,
    lastUpdate: new Date(),
    volatility: 15.2
  },
  {
    pair: 'USD/JPY',
    rate: 148.52,
    bid: 148.48,
    ask: 148.56,
    spread: 0.08,
    change24h: 1.23,
    changePercent24h: 0.83,
    high24h: 149.15,
    low24h: 147.89,
    volume24h: 234567000,
    lastUpdate: new Date(),
    volatility: 11.8
  },
  {
    pair: 'USD/CHF',
    rate: 0.8934,
    bid: 0.8932,
    ask: 0.8936,
    spread: 0.0004,
    change24h: 0.0045,
    changePercent24h: 0.51,
    high24h: 0.8948,
    low24h: 0.8912,
    volume24h: 67890000,
    lastUpdate: new Date(),
    volatility: 9.3
  },
  {
    pair: 'USD/CAD',
    rate: 1.3456,
    bid: 1.3453,
    ask: 1.3459,
    spread: 0.0006,
    change24h: -0.0078,
    changePercent24h: -0.58,
    high24h: 1.3478,
    low24h: 1.3442,
    volume24h: 78901000,
    lastUpdate: new Date(),
    volatility: 8.9
  },
  {
    pair: 'AUD/USD',
    rate: 0.6543,
    bid: 0.6541,
    ask: 0.6545,
    spread: 0.0004,
    change24h: 0.0021,
    changePercent24h: 0.32,
    high24h: 0.6567,
    low24h: 0.6521,
    volume24h: 45678000,
    lastUpdate: new Date(),
    volatility: 13.7
  },
  {
    pair: 'USD/CNY',
    rate: 7.2345,
    bid: 7.2340,
    ask: 7.2350,
    spread: 0.0010,
    change24h: 0.0234,
    changePercent24h: 0.32,
    high24h: 7.2456,
    low24h: 7.2189,
    volume24h: 123456000,
    lastUpdate: new Date(),
    volatility: 6.4
  }
]

const generateMockHistoricalData = (days: number = 30): HistoricalRate[] => {
  const data: HistoricalRate[] = []
  const baseRate = 1.0847
  
  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const rate = baseRate + (Math.random() - 0.5) * 0.05
    data.push({ timestamp, rate, volume: Math.random() * 100000000 })
  }
  
  return data
}

export function CurrencyConverter() {
  const { performance } = usePerformanceMonitor('CurrencyConverter')
  const wsClient = useTradingWebSocket()
  const [rates, setRates] = useState<CurrencyRate[]>(generateMockRates())
  const [fromCurrency, setFromCurrency] = useState<string>('USD')
  const [toCurrency, setToCurrency] = useState<string>('EUR')
  const [amount, setAmount] = useState<string>('1000')
  const [convertedAmount, setConvertedAmount] = useState<number>(0)
  const [selectedPair, setSelectedPair] = useState<string>('EUR/USD')
  const [historicalData, setHistoricalData] = useState<HistoricalRate[]>(generateMockHistoricalData())
  const [watchlist, setWatchlist] = useState<string[]>(['EUR/USD', 'GBP/USD', 'USD/JPY'])

  useEffect(() => {
    // Subscribe to currency updates
    const handleCurrencyUpdate = (data: any) => {
      if (data.type === 'rate_update') {
        setRates(prev => prev.map(rate =>
          rate.pair === data.pair ? { ...rate, ...data.updates, lastUpdate: new Date() } : rate
        ))
      }
    }

    wsClient?.on('currency_updates', handleCurrencyUpdate)

    // Simulate real-time rate updates
    const interval = setInterval(() => {
      setRates(prev => prev.map(rate => ({
        ...rate,
        rate: rate.rate + (Math.random() - 0.5) * 0.001,
        bid: rate.bid + (Math.random() - 0.5) * 0.001,
        ask: rate.ask + (Math.random() - 0.5) * 0.001,
        change24h: rate.change24h + (Math.random() - 0.5) * 0.0005,
        lastUpdate: new Date()
      })))
    }, 2000)

    return () => {
      wsClient?.off('currency_updates', handleCurrencyUpdate)
      clearInterval(interval)
    }
  }, [wsClient])

  useEffect(() => {
    // Calculate conversion
    const pair = `${fromCurrency}/${toCurrency}`
    const inversePair = `${toCurrency}/${fromCurrency}`
    
    let rate = 1
    const directRate = rates.find(r => r.pair === pair)
    const inverseRate = rates.find(r => r.pair === inversePair)
    
    if (directRate) {
      rate = directRate.rate
    } else if (inverseRate) {
      rate = 1 / inverseRate.rate
    } else {
      // Cross-rate calculation via USD
      const fromUSD = rates.find(r => r.pair === `${fromCurrency}/USD` || r.pair === `USD/${fromCurrency}`)
      const toUSD = rates.find(r => r.pair === `${toCurrency}/USD` || r.pair === `USD/${toCurrency}`)
      
      if (fromUSD && toUSD) {
        const fromRate = fromUSD.pair.startsWith('USD') ? 1 / fromUSD.rate : fromUSD.rate
        const toRate = toUSD.pair.startsWith('USD') ? 1 / toUSD.rate : toUSD.rate
        rate = fromRate / toRate
      }
    }
    
    const numAmount = parseFloat(amount) || 0
    setConvertedAmount(numAmount * rate)
  }, [fromCurrency, toCurrency, amount, rates])

  const getHistoricalChart = () => ({
    labels: historicalData.map(d => d.timestamp.toLocaleDateString()),
    datasets: [{
      label: selectedPair,
      data: historicalData.map(d => d.rate),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  })

  const formatCurrency = (value: number, currency: string) => {
    const currencyInfo = supportedCurrencies.find(c => c.code === currency)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 4
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(3)}%`
  }

  const swapCurrencies = () => {
    const temp = fromCurrency
    setFromCurrency(toCurrency)
    setToCurrency(temp)
  }

  const addToWatchlist = (pair: string) => {
    if (!watchlist.includes(pair)) {
      setWatchlist([...watchlist, pair])
    }
  }

  const removeFromWatchlist = (pair: string) => {
    setWatchlist(watchlist.filter(p => p !== pair))
  }

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-6 w-6" />
              Multi-Currency Converter & Analytics
            </CardTitle>
            <CardDescription>
              Real-time currency conversion with market data and analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="converter" className="space-y-4">
              <TabsList>
                <TabsTrigger value="converter">Currency Converter</TabsTrigger>
                <TabsTrigger value="rates">Live Rates</TabsTrigger>
                <TabsTrigger value="analysis">Market Analysis</TabsTrigger>
                <TabsTrigger value="central-banks">Central Banks</TabsTrigger>
              </TabsList>

              <TabsContent value="converter" className="space-y-6">
                {/* Currency Converter */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowsRightLeftIcon className="h-5 w-5" />
                      Currency Converter
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Enter amount"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="from-currency">From</Label>
                        <Select value={fromCurrency} onValueChange={setFromCurrency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {supportedCurrencies.map(currency => (
                              <SelectItem key={currency.code} value={currency.code}>
                                <div className="flex items-center gap-2">
                                  <span>{currency.flag}</span>
                                  <span>{currency.code}</span>
                                  <span className="text-muted-foreground">{currency.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex justify-center">
                        <Button variant="outline" size="icon" onClick={swapCurrencies}>
                          <ArrowsRightLeftIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="to-currency">To</Label>
                        <Select value={toCurrency} onValueChange={setToCurrency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {supportedCurrencies.map(currency => (
                              <SelectItem key={currency.code} value={currency.code}>
                                <div className="flex items-center gap-2">
                                  <span>{currency.flag}</span>
                                  <span>{currency.code}</span>
                                  <span className="text-muted-foreground">{currency.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Result</Label>
                        <div className="h-10 px-3 py-2 border rounded bg-muted flex items-center">
                          <span className="font-mono text-lg">
                            {formatCurrency(convertedAmount, toCurrency)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-blue-50 rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Exchange Rate</div>
                          <div className="font-mono text-lg">
                            1 {fromCurrency} = {(convertedAmount / (parseFloat(amount) || 1)).toFixed(4)} {toCurrency}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Last Updated</div>
                          <div className="text-sm">{new Date().toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Conversions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Conversions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[1, 10, 100, 1000].map(quickAmount => (
                        <div key={quickAmount} className="text-center p-3 border rounded">
                          <div className="font-medium">{quickAmount} {fromCurrency}</div>
                          <div className="text-lg font-bold text-blue-600">
                            {formatCurrency(quickAmount * (convertedAmount / (parseFloat(amount) || 1)), toCurrency)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rates" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Live Exchange Rates</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {rates.length} pairs
                    </Badge>
                    <Badge variant="outline">
                      Live updates
                    </Badge>
                  </div>
                </div>

                {/* Watchlist */}
                <Card>
                  <CardHeader>
                    <CardTitle>Currency Watchlist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {watchlist.map(pair => {
                        const rate = rates.find(r => r.pair === pair)
                        return rate ? (
                          <div key={pair} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium">{rate.pair}</div>
                                <div className="text-sm text-muted-foreground">
                                  Spread: {(rate.spread * 10000).toFixed(1)} pips
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="font-mono text-lg">{rate.rate.toFixed(4)}</div>
                              <div className={`text-sm ${rate.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercent(rate.changePercent24h)}
                              </div>
                            </div>
                            
                            <div className="text-right text-sm">
                              <div className="text-muted-foreground">Vol: {(rate.volume24h / 1000000).toFixed(0)}M</div>
                              <div className="text-muted-foreground">
                                H/L: {rate.high24h.toFixed(4)}/{rate.low24h.toFixed(4)}
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFromWatchlist(pair)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : null
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* All Rates */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Currency Pairs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {rates.map(rate => (
                          <div key={rate.pair} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{rate.pair}</span>
                                <Badge variant="outline">Vol: {rate.volatility.toFixed(1)}%</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Bid: {rate.bid.toFixed(4)} | Ask: {rate.ask.toFixed(4)}
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="font-mono text-lg">{rate.rate.toFixed(4)}</div>
                              <div className={`text-sm ${rate.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {rate.changePercent24h >= 0 ? <TrendingUpIcon className="h-3 w-3 inline mr-1" /> : <TrendingDownIcon className="h-3 w-3 inline mr-1" />}
                                {formatPercent(rate.changePercent24h)}
                              </div>
                            </div>
                            
                            <div className="text-right text-sm">
                              <div className="text-muted-foreground">24h Range</div>
                              <div>{rate.low24h.toFixed(4)} - {rate.high24h.toFixed(4)}</div>
                            </div>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToWatchlist(rate.pair)}
                              disabled={watchlist.includes(rate.pair)}
                            >
                              {watchlist.includes(rate.pair) ? 'Added' : 'Watch'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analysis" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Currency Market Analysis</h3>
                  <Select value={selectedPair} onValueChange={setSelectedPair}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rates.map(rate => (
                        <SelectItem key={rate.pair} value={rate.pair}>
                          {rate.pair}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Price Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedPair} Price Chart</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <Line
                          data={getHistoricalChart()}
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

                  {/* Market Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Market Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {rates.filter(r => r.pair === selectedPair).map(rate => (
                          <div key={rate.pair} className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm text-muted-foreground">Current Rate</div>
                                <div className="text-xl font-bold">{rate.rate.toFixed(4)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">24h Change</div>
                                <div className={`text-xl font-bold ${rate.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatPercent(rate.changePercent24h)}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Volatility</div>
                                <div className="text-lg font-medium">{rate.volatility.toFixed(1)}%</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Volume</div>
                                <div className="text-lg font-medium">{(rate.volume24h / 1000000).toFixed(0)}M</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">24h High</div>
                                <div className="text-lg font-medium">{rate.high24h.toFixed(4)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">24h Low</div>
                                <div className="text-lg font-medium">{rate.low24h.toFixed(4)}</div>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-gray-50 rounded">
                              <div className="text-sm text-muted-foreground mb-1">Spread Analysis</div>
                              <div className="flex justify-between">
                                <span>Bid: {rate.bid.toFixed(4)}</span>
                                <span>Ask: {rate.ask.toFixed(4)}</span>
                              </div>
                              <div className="text-center text-sm text-muted-foreground">
                                Spread: {(rate.spread * 10000).toFixed(1)} pips
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Technical Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Technical Analysis Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 border rounded">
                        <div className="text-sm text-muted-foreground">RSI (14)</div>
                        <div className="text-2xl font-bold text-orange-600">
                          {(Math.random() * 40 + 30).toFixed(0)}
                        </div>
                        <div className="text-sm">Neutral</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-sm text-muted-foreground">MACD</div>
                        <div className="text-2xl font-bold text-green-600">Bullish</div>
                        <div className="text-sm">Signal Line Cross</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-sm text-muted-foreground">Support/Resistance</div>
                        <div className="text-lg font-bold">
                          {(1.0800).toFixed(4)} / {(1.0900).toFixed(4)}
                        </div>
                        <div className="text-sm">Key Levels</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="central-banks" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Central Bank Information</h3>
                  <Badge variant="outline">
                    {supportedCurrencies.length} banks tracked
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {supportedCurrencies.map(currency => (
                    <Card key={currency.code}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-2xl">{currency.flag}</span>
                          <div>
                            <div>{currency.name} ({currency.code})</div>
                            <div className="text-sm text-muted-foreground">{currency.centralBank}</div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Interest Rate</div>
                            <div className="text-xl font-bold text-blue-600">
                              {currency.interestRate.toFixed(2)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Inflation</div>
                            <div className="text-xl font-bold text-orange-600">
                              {currency.inflation.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">GDP Growth</div>
                            <div className={`text-xl font-bold ${currency.gdp >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {currency.gdp >= 0 ? '+' : ''}{currency.gdp.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Country</div>
                            <div className="text-lg font-medium">{currency.country}</div>
                          </div>
                        </div>
                        
                        {currency.nextMeeting && (
                          <div className="p-3 bg-blue-50 rounded">
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarIcon className="h-4 w-4" />
                              <span className="font-medium">Next Meeting:</span>
                              <span>{currency.nextMeeting.toLocaleDateString()}</span>
                            </div>
                            {currency.lastMeeting && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Last meeting: {currency.lastMeeting.toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}
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
                        { date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), event: 'FOMC Meeting', currency: 'USD', impact: 'High' },
                        { date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), event: 'ECB Press Conference', currency: 'EUR', impact: 'High' },
                        { date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), event: 'Bank of England Meeting', currency: 'GBP', impact: 'Medium' },
                        { date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), event: 'Bank of Japan Meeting', currency: 'JPY', impact: 'Medium' }
                      ].map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">{event.event}</div>
                              <div className="text-sm text-muted-foreground">
                                {event.date.toLocaleDateString()} at {event.date.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{event.currency}</Badge>
                            <Badge variant={event.impact === 'High' ? 'destructive' : 'default'}>
                              {event.impact}
                            </Badge>
                          </div>
                        </div>
                      ))}
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