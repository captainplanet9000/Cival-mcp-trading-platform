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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ScaleIcon,
  BoltIcon,
  FireIcon,
  HeartIcon,
  EyeIcon,
  ClockIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  CpuChipIcon,
  SignalIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
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
  Filler,
  ArcElement
} from 'chart.js'
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
)

interface RiskMetrics {
  portfolio: {
    totalValue: number
    dailyVar95: number
    dailyVar99: number
    expectedShortfall: number
    maxDrawdown: number
    volatility: number
    beta: number
    sharpeRatio: number
    sortinoRatio: number
    calmarRatio: number
    infoRatio: number
    treynorRatio: number
  }
  concentration: {
    herfindahlIndex: number
    topHoldings: Array<{
      symbol: string
      weight: number
      contribution: number
    }>
    sectorConcentration: Record<string, number>
    geographicConcentration: Record<string, number>
  }
  liquidity: {
    liquidityScore: number
    avgDailyVolume: number
    bidAskSpread: number
    marketImpact: number
    timeToLiquidate: number
    liquidityRisk: number
  }
  counterparty: {
    exposureLimit: number
    currentExposure: number
    creditRating: string
    defaultProbability: number
    recoveryRate: number
    potentialLoss: number
  }
  operational: {
    systemUptime: number
    executionLatency: number
    errorRate: number
    complianceScore: number
    auditScore: number
    cybersecurityScore: number
  }
  scenario: {
    scenarios: Array<{
      name: string
      probability: number
      impact: number
      portfolioChange: number
      description: string
    }>
    stressTests: Array<{
      name: string
      severity: 'low' | 'medium' | 'high' | 'extreme'
      result: number
      duration: number
    }>
  }
}

interface RiskAlert {
  id: string
  type: 'limit_breach' | 'concentration' | 'volatility' | 'drawdown' | 'liquidity' | 'operational'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendation: string
  timestamp: Date
  acknowledged: boolean
  value: number
  threshold: number
}

const generateMockRiskData = (): RiskMetrics => ({
  portfolio: {
    totalValue: 1500000,
    dailyVar95: -75000,
    dailyVar99: -120000,
    expectedShortfall: -150000,
    maxDrawdown: -12.5,
    volatility: 18.3,
    beta: 1.15,
    sharpeRatio: 1.8,
    sortinoRatio: 2.3,
    calmarRatio: 1.2,
    infoRatio: 0.85,
    treynorRatio: 0.14
  },
  concentration: {
    herfindahlIndex: 0.15,
    topHoldings: [
      { symbol: 'AAPL', weight: 8.5, contribution: 12.3 },
      { symbol: 'MSFT', weight: 7.2, contribution: 9.8 },
      { symbol: 'GOOGL', weight: 6.8, contribution: 11.2 },
      { symbol: 'TSLA', weight: 5.5, contribution: 15.7 },
      { symbol: 'NVDA', weight: 4.9, contribution: 18.9 }
    ],
    sectorConcentration: {
      'Technology': 45.2,
      'Financial': 18.5,
      'Healthcare': 12.3,
      'Energy': 8.7,
      'Consumer': 15.3
    },
    geographicConcentration: {
      'United States': 65.8,
      'Europe': 18.4,
      'Asia': 12.1,
      'Emerging Markets': 3.7
    }
  },
  liquidity: {
    liquidityScore: 8.2,
    avgDailyVolume: 850000000,
    bidAskSpread: 0.015,
    marketImpact: 0.25,
    timeToLiquidate: 2.5,
    liquidityRisk: 3.2
  },
  counterparty: {
    exposureLimit: 500000,
    currentExposure: 325000,
    creditRating: 'A+',
    defaultProbability: 0.08,
    recoveryRate: 0.65,
    potentialLoss: 113750
  },
  operational: {
    systemUptime: 99.95,
    executionLatency: 12.5,
    errorRate: 0.05,
    complianceScore: 95.2,
    auditScore: 92.8,
    cybersecurityScore: 88.5
  },
  scenario: {
    scenarios: [
      { name: 'Market Crash (-30%)', probability: 5, impact: 85, portfolioChange: -35.2, description: 'Severe market downturn' },
      { name: 'Interest Rate Spike', probability: 15, impact: 65, portfolioChange: -18.7, description: 'Rapid rate increases' },
      { name: 'Geopolitical Crisis', probability: 25, impact: 45, portfolioChange: -12.3, description: 'Global uncertainty' },
      { name: 'Tech Bubble Burst', probability: 10, impact: 75, portfolioChange: -28.9, description: 'Technology sector collapse' },
      { name: 'Currency Crisis', probability: 8, impact: 55, portfolioChange: -15.6, description: 'Major currency devaluation' }
    ],
    stressTests: [
      { name: '2008 Financial Crisis', severity: 'extreme', result: -42.3, duration: 180 },
      { name: 'COVID-19 Pandemic', severity: 'high', result: -28.5, duration: 45 },
      { name: 'Dot-com Bubble', severity: 'high', result: -35.8, duration: 365 },
      { name: 'Flash Crash', severity: 'medium', result: -15.2, duration: 1 }
    ]
  }
})

const generateMockAlerts = (): RiskAlert[] => [
  {
    id: '1',
    type: 'concentration',
    severity: 'high',
    title: 'Sector Concentration Exceeded',
    description: 'Technology sector allocation (45.2%) exceeds maximum threshold (40%)',
    recommendation: 'Consider reducing technology exposure or increasing diversification',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    acknowledged: false,
    value: 45.2,
    threshold: 40
  },
  {
    id: '2',
    type: 'volatility',
    severity: 'medium',
    title: 'Increased Portfolio Volatility',
    description: 'Portfolio volatility (18.3%) above normal range',
    recommendation: 'Review position sizes and consider hedging strategies',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    acknowledged: false,
    value: 18.3,
    threshold: 15
  },
  {
    id: '3',
    type: 'limit_breach',
    severity: 'critical',
    title: 'VaR Limit Approached',
    description: 'Daily VaR ($120k) is 80% of maximum allowed limit',
    recommendation: 'Immediate position review required',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    acknowledged: false,
    value: 120000,
    threshold: 150000
  }
]

export function RiskAnalysis() {
  const { performance } = usePerformanceMonitor('RiskAnalysis')
  const wsClient = useTradingWebSocket()
  const [riskData, setRiskData] = useState<RiskMetrics>(generateMockRiskData())
  const [alerts, setAlerts] = useState<RiskAlert[]>(generateMockAlerts())
  const [selectedView, setSelectedView] = useState<'overview' | 'concentration' | 'scenarios' | 'alerts'>('overview')
  const [timeHorizon, setTimeHorizon] = useState<'1d' | '1w' | '1m' | '3m' | '1y'>('1d')
  const [confidenceLevel, setConfidenceLevel] = useState<95 | 99>(95)

  useEffect(() => {
    // Subscribe to real-time risk updates
    const handleRiskUpdate = (data: any) => {
      if (data.type === 'risk_metrics') {
        setRiskData(prev => ({ ...prev, ...data.metrics }))
      } else if (data.type === 'risk_alert') {
        setAlerts(prev => [data.alert, ...prev])
      }
    }

    wsClient?.on('risk_analysis', handleRiskUpdate)
    return () => {
      wsClient?.off('risk_analysis', handleRiskUpdate)
    }
  }, [wsClient])

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }

  const getRiskLevel = (value: number, thresholds: number[]) => {
    if (value <= thresholds[0]) return { level: 'low', color: 'text-green-600' }
    if (value <= thresholds[1]) return { level: 'medium', color: 'text-yellow-600' }
    if (value <= thresholds[2]) return { level: 'high', color: 'text-orange-600' }
    return { level: 'critical', color: 'text-red-600' }
  }

  const getConcentrationData = () => ({
    labels: Object.keys(riskData.concentration.sectorConcentration),
    datasets: [{
      data: Object.values(riskData.concentration.sectorConcentration),
      backgroundColor: [
        'hsl(210, 100%, 60%)',
        'hsl(150, 100%, 60%)',
        'hsl(30, 100%, 60%)',
        'hsl(270, 100%, 60%)',
        'hsl(0, 100%, 60%)'
      ]
    }]
  })

  const getScenarioData = () => ({
    datasets: [{
      label: 'Risk Scenarios',
      data: riskData.scenario.scenarios.map(s => ({
        x: s.probability,
        y: s.portfolioChange,
        label: s.name
      })),
      backgroundColor: riskData.scenario.scenarios.map(s => 
        s.impact > 70 ? 'rgba(239, 68, 68, 0.6)' :
        s.impact > 50 ? 'rgba(245, 158, 11, 0.6)' :
        'rgba(34, 197, 94, 0.6)'
      ),
      pointRadius: riskData.scenario.scenarios.map(s => s.impact / 10)
    }]
  })

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldExclamationIcon className="h-6 w-6" />
              Risk Analysis Dashboard
            </CardTitle>
            <CardDescription>
              Comprehensive risk monitoring and analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="concentration">Concentration</TabsTrigger>
                <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                <TabsTrigger value="alerts">
                  Alerts
                  {alerts.filter(a => !a.acknowledged).length > 0 && (
                    <Badge className="ml-2" variant="destructive">
                      {alerts.filter(a => !a.acknowledged).length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Key Risk Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Daily VaR (95%)</p>
                          <p className="text-2xl font-bold text-red-600">
                            ${Math.abs(riskData.portfolio.dailyVar95).toLocaleString()}
                          </p>
                        </div>
                        <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                      </div>
                      <Progress 
                        value={(Math.abs(riskData.portfolio.dailyVar95) / 150000) * 100} 
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Max Drawdown</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {riskData.portfolio.maxDrawdown.toFixed(1)}%
                          </p>
                        </div>
                        <ArrowTrendingDownIcon className="h-8 w-8 text-orange-500" />
                      </div>
                      <Progress 
                        value={(Math.abs(riskData.portfolio.maxDrawdown) / 20) * 100} 
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Volatility</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {riskData.portfolio.volatility.toFixed(1)}%
                          </p>
                        </div>
                        <BoltIcon className="h-8 w-8 text-yellow-500" />
                      </div>
                      <Progress 
                        value={(riskData.portfolio.volatility / 30) * 100} 
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                          <p className="text-2xl font-bold text-green-600">
                            {riskData.portfolio.sharpeRatio.toFixed(2)}
                          </p>
                        </div>
                        <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
                      </div>
                      <Progress 
                        value={(riskData.portfolio.sharpeRatio / 3) * 100} 
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Risk Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Portfolio Risk Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { label: 'Beta', value: riskData.portfolio.beta, format: 'ratio' },
                          { label: 'Sortino Ratio', value: riskData.portfolio.sortinoRatio, format: 'ratio' },
                          { label: 'Calmar Ratio', value: riskData.portfolio.calmarRatio, format: 'ratio' },
                          { label: 'Information Ratio', value: riskData.portfolio.infoRatio, format: 'ratio' }
                        ].map(metric => (
                          <div key={metric.label} className="flex justify-between items-center">
                            <span className="text-sm font-medium">{metric.label}</span>
                            <span className="font-mono">{metric.value.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Operational Risk</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { label: 'System Uptime', value: riskData.operational.systemUptime, format: 'percent', icon: HeartIcon },
                          { label: 'Execution Latency', value: riskData.operational.executionLatency, format: 'ms', icon: ClockIcon },
                          { label: 'Error Rate', value: riskData.operational.errorRate, format: 'percent', icon: ExclamationTriangleIcon },
                          { label: 'Compliance Score', value: riskData.operational.complianceScore, format: 'score', icon: ShieldExclamationIcon }
                        ].map(metric => (
                          <div key={metric.label} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <metric.icon className="h-4 w-4" />
                              <span className="text-sm font-medium">{metric.label}</span>
                            </div>
                            <span className="font-mono">
                              {metric.format === 'percent' ? `${metric.value.toFixed(2)}%` :
                               metric.format === 'ms' ? `${metric.value.toFixed(1)}ms` :
                               metric.format === 'score' ? `${metric.value.toFixed(1)}` :
                               metric.value.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="concentration" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sector Concentration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <Doughnut
                          data={getConcentrationData()}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'right'
                              }
                            }
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Holdings Risk Contribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {riskData.concentration.topHoldings.map(holding => (
                          <div key={holding.symbol} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{holding.symbol}</span>
                              <span>{holding.weight.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Risk Contribution</span>
                              <span>{holding.contribution.toFixed(1)}%</span>
                            </div>
                            <Progress value={holding.contribution} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Liquidity Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {riskData.liquidity.liquidityScore.toFixed(1)}
                        </p>
                        <p className="text-sm text-muted-foreground">Liquidity Score</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {riskData.liquidity.timeToLiquidate.toFixed(1)}d
                        </p>
                        <p className="text-sm text-muted-foreground">Time to Liquidate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {riskData.liquidity.marketImpact.toFixed(2)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Market Impact</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scenarios" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Scenario Analysis</CardTitle>
                    <CardDescription>
                      Probability vs Impact analysis of potential market scenarios
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <Scatter
                        data={getScenarioData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            x: {
                              title: {
                                display: true,
                                text: 'Probability (%)'
                              },
                              min: 0,
                              max: 30
                            },
                            y: {
                              title: {
                                display: true,
                                text: 'Portfolio Impact (%)'
                              }
                            }
                          },
                          plugins: {
                            tooltip: {
                              callbacks: {
                                label: function(context: any) {
                                  const point = context.raw
                                  return `${point.label}: ${point.y.toFixed(1)}% impact, ${point.x}% probability`
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
                    <CardTitle>Historical Stress Tests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {riskData.scenario.stressTests.map((test, idx) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{test.name}</h4>
                              <Badge variant={
                                test.severity === 'extreme' ? 'destructive' :
                                test.severity === 'high' ? 'default' :
                                test.severity === 'medium' ? 'secondary' :
                                'outline'
                              }>
                                {test.severity}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-red-600">
                                {test.result.toFixed(1)}%
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {test.duration} days
                              </p>
                            </div>
                          </div>
                          <Progress 
                            value={(Math.abs(test.result) / 50) * 100}
                            className="mt-3"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alerts" className="space-y-4">
                {alerts.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">No Active Alerts</h3>
                      <p className="text-muted-foreground">All risk metrics are within acceptable ranges</p>
                    </CardContent>
                  </Card>
                ) : (
                  alerts.map(alert => (
                    <Alert key={alert.id} className={
                      alert.severity === 'critical' ? 'border-red-500' :
                      alert.severity === 'high' ? 'border-orange-500' :
                      alert.severity === 'medium' ? 'border-yellow-500' :
                      'border-blue-500'
                    }>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {alert.severity === 'critical' && <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />}
                            {alert.severity === 'high' && <FireIcon className="h-5 w-5 text-orange-500" />}
                            {alert.severity === 'medium' && <SignalIcon className="h-5 w-5 text-yellow-500" />}
                            {alert.severity === 'low' && <EyeIcon className="h-5 w-5 text-blue-500" />}
                            <h4 className="font-semibold">{alert.title}</h4>
                            <Badge variant={
                              alert.severity === 'critical' ? 'destructive' :
                              alert.severity === 'high' ? 'default' :
                              alert.severity === 'medium' ? 'secondary' :
                              'outline'
                            }>
                              {alert.severity}
                            </Badge>
                          </div>
                          <AlertDescription className="mb-2">
                            {alert.description}
                          </AlertDescription>
                          <p className="text-sm text-muted-foreground italic">
                            Recommendation: {alert.recommendation}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {alert.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {!alert.acknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {alert.acknowledged && (
                            <Badge variant="outline">Acknowledged</Badge>
                          )}
                        </div>
                      </div>
                    </Alert>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PremiumThemeProvider>
  )
}