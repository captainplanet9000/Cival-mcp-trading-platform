'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  ArrowsRightLeftIcon,
  ChartBarIcon,
  BeakerIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ScaleIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon
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
import { Line, Scatter } from 'react-chartjs-2'

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

interface AssetCorrelation {
  asset1: string
  asset2: string
  correlation: number
  pValue: number
  rollingCorrelation: number[]
  significance: 'high' | 'medium' | 'low'
  timeframe: '1M' | '3M' | '6M' | '1Y' | '3Y'
}

interface CrossAssetSignal {
  id: string
  type: 'rotation' | 'divergence' | 'convergence' | 'momentum' | 'reversal'
  fromAsset: string
  toAsset: string
  strength: number
  confidence: number
  timeHorizon: 'short' | 'medium' | 'long'
  description: string
  timestamp: Date
  status: 'active' | 'triggered' | 'expired'
}

interface MarketRegime {
  id: string
  name: string
  description: string
  probability: number
  characteristics: string[]
  favoredAssets: string[]
  riskLevel: 'low' | 'medium' | 'high'
  duration: string
  lastOccurrence?: Date
}

interface FactorExposure {
  factor: string
  exposure: number
  contribution: number
  volatility: number
  sharpe: number
  assets: Array<{
    asset: string
    loading: number
    weight: number
  }>
}

const generateMockCorrelations = (): AssetCorrelation[] => [
  {
    asset1: 'US Equities',
    asset2: 'European Equities',
    correlation: 0.78,
    pValue: 0.001,
    rollingCorrelation: Array.from({ length: 20 }, (_, i) => 0.78 + (Math.random() - 0.5) * 0.3),
    significance: 'high',
    timeframe: '1Y'
  },
  {
    asset1: 'US Equities',
    asset2: 'Bonds',
    correlation: -0.25,
    pValue: 0.045,
    rollingCorrelation: Array.from({ length: 20 }, (_, i) => -0.25 + (Math.random() - 0.5) * 0.4),
    significance: 'medium',
    timeframe: '1Y'
  },
  {
    asset1: 'Gold',
    asset2: 'US Dollar',
    correlation: -0.62,
    pValue: 0.002,
    rollingCorrelation: Array.from({ length: 20 }, (_, i) => -0.62 + (Math.random() - 0.5) * 0.2),
    significance: 'high',
    timeframe: '1Y'
  },
  {
    asset1: 'Oil',
    asset2: 'Energy Stocks',
    correlation: 0.85,
    pValue: 0.000,
    rollingCorrelation: Array.from({ length: 20 }, (_, i) => 0.85 + (Math.random() - 0.5) * 0.15),
    significance: 'high',
    timeframe: '1Y'
  },
  {
    asset1: 'Bitcoin',
    asset2: 'Tech Stocks',
    correlation: 0.45,
    pValue: 0.012,
    rollingCorrelation: Array.from({ length: 20 }, (_, i) => 0.45 + (Math.random() - 0.5) * 0.5),
    significance: 'medium',
    timeframe: '1Y'
  },
  {
    asset1: 'VIX',
    asset2: 'US Equities',
    correlation: -0.72,
    pValue: 0.000,
    rollingCorrelation: Array.from({ length: 20 }, (_, i) => -0.72 + (Math.random() - 0.5) * 0.2),
    significance: 'high',
    timeframe: '1Y'
  }
]

const generateMockSignals = (): CrossAssetSignal[] => [
  {
    id: 'signal-1',
    type: 'rotation',
    fromAsset: 'Growth Stocks',
    toAsset: 'Value Stocks',
    strength: 0.75,
    confidence: 0.68,
    timeHorizon: 'medium',
    description: 'Rising interest rates favoring value over growth stocks',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'active'
  },
  {
    id: 'signal-2',
    type: 'divergence',
    fromAsset: 'US Equities',
    toAsset: 'US Dollar',
    strength: 0.82,
    confidence: 0.71,
    timeHorizon: 'short',
    description: 'Equity strength diverging from dollar weakness',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    status: 'active'
  },
  {
    id: 'signal-3',
    type: 'momentum',
    fromAsset: 'Commodities',
    toAsset: 'Energy Sector',
    strength: 0.69,
    confidence: 0.85,
    timeHorizon: 'long',
    description: 'Commodity super-cycle driving energy sector momentum',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: 'triggered'
  },
  {
    id: 'signal-4',
    type: 'convergence',
    fromAsset: 'European Bonds',
    toAsset: 'US Bonds',
    strength: 0.58,
    confidence: 0.62,
    timeHorizon: 'medium',
    description: 'Central bank policy convergence reducing yield spreads',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    status: 'active'
  }
]

const generateMockRegimes = (): MarketRegime[] => [
  {
    id: 'growth',
    name: 'Growth Environment',
    description: 'Low inflation, accommodative monetary policy, strong corporate earnings',
    probability: 0.35,
    characteristics: ['Low Interest Rates', 'High Liquidity', 'Strong GDP Growth', 'Low Volatility'],
    favoredAssets: ['Growth Stocks', 'Technology', 'Emerging Markets', 'High Yield Bonds'],
    riskLevel: 'medium',
    duration: '12-18 months',
    lastOccurrence: new Date('2021-03-15')
  },
  {
    id: 'inflation',
    name: 'Inflationary Regime',
    description: 'Rising prices, monetary tightening, supply chain pressures',
    probability: 0.45,
    characteristics: ['Rising Inflation', 'Hawkish Central Banks', 'Supply Constraints', 'Wage Growth'],
    favoredAssets: ['Commodities', 'TIPS', 'Value Stocks', 'Real Estate'],
    riskLevel: 'high',
    duration: '6-12 months'
  },
  {
    id: 'recession',
    name: 'Recessionary Environment',
    description: 'Economic contraction, defensive positioning, flight to quality',
    probability: 0.15,
    characteristics: ['Negative GDP Growth', 'Rising Unemployment', 'Credit Stress', 'Central Bank Easing'],
    favoredAssets: ['Government Bonds', 'Defensive Stocks', 'Gold', 'Cash'],
    riskLevel: 'high',
    duration: '9-15 months',
    lastOccurrence: new Date('2020-04-01')
  },
  {
    id: 'transition',
    name: 'Transition Period',
    description: 'Uncertain economic outlook, mixed signals, increased volatility',
    probability: 0.05,
    characteristics: ['Mixed Economic Data', 'Policy Uncertainty', 'High Volatility', 'Sector Rotation'],
    favoredAssets: ['Quality Stocks', 'Diversified Bonds', 'Alternative Investments'],
    riskLevel: 'medium',
    duration: '3-6 months'
  }
]

const generateMockFactors = (): FactorExposure[] => [
  {
    factor: 'Market Beta',
    exposure: 0.85,
    contribution: 45.2,
    volatility: 12.8,
    sharpe: 0.72,
    assets: [
      { asset: 'US Large Cap', loading: 0.92, weight: 35.0 },
      { asset: 'International Developed', loading: 0.78, weight: 20.0 },
      { asset: 'Emerging Markets', loading: 1.15, weight: 8.0 }
    ]
  },
  {
    factor: 'Size Factor',
    exposure: -0.12,
    contribution: -2.8,
    volatility: 8.4,
    sharpe: -0.15,
    assets: [
      { asset: 'Small Cap Value', loading: 1.25, weight: 5.0 },
      { asset: 'Large Cap Growth', loading: -0.45, weight: 25.0 }
    ]
  },
  {
    factor: 'Value Factor',
    exposure: 0.23,
    contribution: 8.7,
    volatility: 15.2,
    sharpe: 0.35,
    assets: [
      { asset: 'Value Stocks', loading: 1.0, weight: 15.0 },
      { asset: 'Energy Sector', loading: 1.35, weight: 6.0 }
    ]
  },
  {
    factor: 'Quality Factor',
    exposure: 0.45,
    contribution: 12.3,
    volatility: 9.1,
    sharpe: 0.68,
    assets: [
      { asset: 'Quality Stocks', loading: 1.0, weight: 18.0 },
      { asset: 'Healthcare', loading: 0.78, weight: 12.0 }
    ]
  },
  {
    factor: 'Momentum Factor',
    exposure: 0.18,
    contribution: 6.4,
    volatility: 18.7,
    sharpe: 0.28,
    assets: [
      { asset: 'Technology', loading: 0.85, weight: 22.0 },
      { asset: 'Growth Stocks', loading: 0.65, weight: 20.0 }
    ]
  }
]

export function CrossAssetAnalysis() {
  const { performance } = usePerformanceMonitor('CrossAssetAnalysis')
  const wsClient = useTradingWebSocket()
  const [correlations, setCorrelations] = useState<AssetCorrelation[]>(generateMockCorrelations())
  const [signals, setSignals] = useState<CrossAssetSignal[]>(generateMockSignals())
  const [regimes, setRegimes] = useState<MarketRegime[]>(generateMockRegimes())
  const [factors, setFactors] = useState<FactorExposure[]>(generateMockFactors())
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | '3Y'>('1Y')
  const [selectedAsset, setSelectedAsset] = useState<string>('US Equities')

  useEffect(() => {
    // Subscribe to cross-asset updates
    const handleCrossAssetUpdate = (data: any) => {
      if (data.type === 'correlation_update') {
        setCorrelations(prev => prev.map(corr =>
          corr.asset1 === data.asset1 && corr.asset2 === data.asset2
            ? { ...corr, correlation: data.correlation, rollingCorrelation: [...corr.rollingCorrelation.slice(1), data.correlation] }
            : corr
        ))
      } else if (data.type === 'signal_update') {
        setSignals(prev => prev.map(signal =>
          signal.id === data.signalId ? { ...signal, ...data.updates } : signal
        ))
      } else if (data.type === 'regime_update') {
        setRegimes(prev => prev.map(regime =>
          regime.id === data.regimeId ? { ...regime, probability: data.probability } : regime
        ))
      }
    }

    wsClient?.on('cross_asset_updates', handleCrossAssetUpdate)

    // Simulate real-time updates
    const interval = setInterval(() => {
      setCorrelations(prev => prev.map(corr => ({
        ...corr,
        correlation: corr.correlation + (Math.random() - 0.5) * 0.05,
        rollingCorrelation: [...corr.rollingCorrelation.slice(1), corr.correlation + (Math.random() - 0.5) * 0.1]
      })))
    }, 10000)

    return () => {
      wsClient?.off('cross_asset_updates', handleCrossAssetUpdate)
      clearInterval(interval)
    }
  }, [wsClient])

  const getCorrelationColor = (correlation: number) => {
    const abs = Math.abs(correlation)
    if (abs > 0.7) return correlation > 0 ? 'text-blue-600' : 'text-red-600'
    if (abs > 0.4) return correlation > 0 ? 'text-blue-400' : 'text-red-400'
    return 'text-gray-500'
  }

  const getSignalTypeColor = (type: CrossAssetSignal['type']) => {
    switch (type) {
      case 'rotation': return 'bg-blue-100 text-blue-800'
      case 'divergence': return 'bg-orange-100 text-orange-800'
      case 'convergence': return 'bg-green-100 text-green-800'
      case 'momentum': return 'bg-purple-100 text-purple-800'
      case 'reversal': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCorrelationChart = (correlation: AssetCorrelation) => ({
    labels: correlation.rollingCorrelation.map((_, i) => `T-${correlation.rollingCorrelation.length - i - 1}`),
    datasets: [{
      label: 'Rolling Correlation',
      data: correlation.rollingCorrelation,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  })

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowsRightLeftIcon className="h-6 w-6" />
              Cross-Asset Analysis Dashboard
            </CardTitle>
            <CardDescription>
              Advanced correlation analysis, market regime detection, and cross-asset signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="correlations" className="space-y-4">
              <TabsList>
                <TabsTrigger value="correlations">Asset Correlations</TabsTrigger>
                <TabsTrigger value="signals">Cross-Asset Signals</TabsTrigger>
                <TabsTrigger value="regimes">Market Regimes</TabsTrigger>
                <TabsTrigger value="factors">Factor Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="correlations" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Asset Correlation Matrix</h3>
                  <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1M">1 Month</SelectItem>
                      <SelectItem value="3M">3 Months</SelectItem>
                      <SelectItem value="6M">6 Months</SelectItem>
                      <SelectItem value="1Y">1 Year</SelectItem>
                      <SelectItem value="3Y">3 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Correlation Heatmap */}
                <Card>
                  <CardHeader>
                    <CardTitle>Correlation Heatmap</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {correlations.map(corr => (
                        <div key={`${corr.asset1}-${corr.asset2}`} className="p-4 border rounded">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm">
                              <div className="font-medium">{corr.asset1}</div>
                              <div className="text-muted-foreground">vs {corr.asset2}</div>
                            </div>
                            <Badge variant={corr.significance === 'high' ? 'default' : 'outline'}>
                              {corr.significance}
                            </Badge>
                          </div>
                          
                          <div className={`text-2xl font-bold ${getCorrelationColor(corr.correlation)}`}>
                            {corr.correlation.toFixed(3)}
                          </div>
                          
                          <div className="text-xs text-muted-foreground mt-1">
                            p-value: {corr.pValue.toFixed(3)}
                          </div>
                          
                          <div className="mt-3 h-16">
                            <Line
                              data={getCorrelationChart(corr)}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                  x: { display: false },
                                  y: { 
                                    min: -1,
                                    max: 1,
                                    ticks: { display: false },
                                    grid: { display: false }
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Correlation Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Correlation Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {correlations.map(corr => (
                          <div key={`${corr.asset1}-${corr.asset2}`} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{corr.asset1}</span>
                                <ArrowsRightLeftIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{corr.asset2}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {corr.timeframe} rolling • p-value: {corr.pValue.toFixed(3)}
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className={`text-xl font-bold ${getCorrelationColor(corr.correlation)}`}>
                                {corr.correlation.toFixed(3)}
                              </div>
                              <Badge variant={corr.significance === 'high' ? 'default' : 'outline'}>
                                {corr.significance}
                              </Badge>
                            </div>
                            
                            <div className="text-right text-sm">
                              <div className="text-muted-foreground">Change</div>
                              <div className={`font-medium ${
                                corr.rollingCorrelation[corr.rollingCorrelation.length - 1] > corr.rollingCorrelation[corr.rollingCorrelation.length - 2]
                                  ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {corr.rollingCorrelation[corr.rollingCorrelation.length - 1] > corr.rollingCorrelation[corr.rollingCorrelation.length - 2]
                                  ? '+' : ''}{((corr.rollingCorrelation[corr.rollingCorrelation.length - 1] - 
                                  corr.rollingCorrelation[corr.rollingCorrelation.length - 2]) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="signals" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Active Cross-Asset Signals</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {signals.filter(s => s.status === 'active').length} Active
                    </Badge>
                    <Badge variant="outline">
                      {signals.filter(s => s.status === 'triggered').length} Triggered
                    </Badge>
                  </div>
                </div>

                {/* Signal Cards */}
                <div className="space-y-4">
                  {signals.map(signal => (
                    <Card key={signal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getSignalTypeColor(signal.type)}>
                                {signal.type.toUpperCase()}
                              </Badge>
                              <Badge variant={signal.status === 'active' ? 'default' : 'outline'}>
                                {signal.status}
                              </Badge>
                              <Badge variant="outline">{signal.timeHorizon}</Badge>
                            </div>
                            
                            <h4 className="font-semibold mb-1">
                              {signal.fromAsset} → {signal.toAsset}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {signal.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Generated: {signal.timestamp.toLocaleString()}</span>
                              <span>Strength: {formatPercent(signal.strength)}</span>
                              <span>Confidence: {formatPercent(signal.confidence)}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-2">
                              <span className="text-lg font-bold text-blue-600">
                                {Math.round(signal.strength * 100)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">Signal Strength</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Signal Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Signal Performance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['rotation', 'divergence', 'convergence', 'momentum'].map(type => (
                        <div key={type} className="text-center p-3 border rounded">
                          <div className="font-medium capitalize">{type}</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {signals.filter(s => s.type === type).length}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatPercent(Math.random() * 0.4 + 0.5)} accuracy
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="regimes" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Market Regime Analysis</h3>
                  <div className="text-sm text-muted-foreground">
                    Current regime probability-weighted outlook
                  </div>
                </div>

                {/* Regime Probabilities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BeakerIcon className="h-5 w-5" />
                      Regime Probabilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {regimes.map(regime => (
                        <div key={regime.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{regime.name}</span>
                              <Badge variant={regime.riskLevel === 'high' ? 'destructive' : 'outline'}>
                                {regime.riskLevel} risk
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">{formatPercent(regime.probability)}</div>
                              <div className="text-xs text-muted-foreground">{regime.duration}</div>
                            </div>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${regime.probability * 100}%` }}
                            ></div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">{regime.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Regime Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {regimes.filter(r => r.probability > 0.2).map(regime => (
                    <Card key={regime.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {regime.name}
                          <Badge variant={regime.probability > 0.4 ? 'default' : 'outline'}>
                            {formatPercent(regime.probability)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Key Characteristics</h4>
                          <div className="flex flex-wrap gap-1">
                            {regime.characteristics.map(char => (
                              <Badge key={char} variant="outline" className="text-xs">
                                {char}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Favored Assets</h4>
                          <div className="flex flex-wrap gap-1">
                            {regime.favoredAssets.map(asset => (
                              <Badge key={asset} variant="secondary" className="text-xs">
                                {asset}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {regime.lastOccurrence && (
                          <div className="text-sm text-muted-foreground">
                            Last occurrence: {regime.lastOccurrence.toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="factors" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Factor Exposure Analysis</h3>
                  <div className="text-sm text-muted-foreground">
                    Portfolio factor loadings and contributions
                  </div>
                </div>

                {/* Factor Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Factor Contribution Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {factors.map(factor => (
                        <div key={factor.factor} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{factor.factor}</span>
                              <Badge variant="outline">
                                {factor.exposure >= 0 ? '+' : ''}{factor.exposure.toFixed(2)}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${factor.contribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {factor.contribution >= 0 ? '+' : ''}{factor.contribution.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Sharpe: {factor.sharpe.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${factor.contribution >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.abs(factor.contribution) * 2}%` }}
                            ></div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            Volatility: {factor.volatility.toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Factor Detail */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {factors.map(factor => (
                    <Card key={factor.factor}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {factor.factor}
                          <Badge variant={Math.abs(factor.exposure) > 0.5 ? 'default' : 'outline'}>
                            {factor.exposure >= 0 ? '+' : ''}{factor.exposure.toFixed(2)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Contribution</div>
                              <div className={`font-medium ${factor.contribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {factor.contribution >= 0 ? '+' : ''}{factor.contribution.toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Volatility</div>
                              <div className="font-medium">{factor.volatility.toFixed(1)}%</div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Asset Loadings</h4>
                            <div className="space-y-2">
                              {factor.assets.map(asset => (
                                <div key={asset.asset} className="flex justify-between items-center text-sm">
                                  <span>{asset.asset}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{asset.weight.toFixed(1)}%</span>
                                    <span className={`font-medium ${asset.loading >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                      {asset.loading.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Factor Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Factor Risk Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 border rounded">
                        <div className="text-sm text-muted-foreground">Total Factor Risk</div>
                        <div className="text-xl font-bold text-blue-600">
                          {Math.sqrt(factors.reduce((sum, f) => sum + Math.pow(f.volatility * f.exposure, 2), 0)).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-sm text-muted-foreground">Specific Risk</div>
                        <div className="text-xl font-bold text-green-600">
                          {(Math.random() * 5 + 3).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-sm text-muted-foreground">R-Squared</div>
                        <div className="text-xl font-bold text-purple-600">
                          {(Math.random() * 0.3 + 0.65).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-sm text-muted-foreground">Tracking Error</div>
                        <div className="text-xl font-bold text-orange-600">
                          {(Math.random() * 2 + 1).toFixed(1)}%
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