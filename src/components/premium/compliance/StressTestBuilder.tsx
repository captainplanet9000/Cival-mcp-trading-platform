'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  TestTube, 
  Play, 
  Pause,
  Settings, 
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Copy,
  Edit3,
  Trash2
} from 'lucide-react';
import {
  LineChart, Line,
  BarChart, Bar,
  ScatterChart, Scatter,
  ResponsiveContainer,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

interface StressTest {
  id: string;
  name: string;
  description: string;
  type: 'historical' | 'monte_carlo' | 'custom' | 'regulatory';
  status: 'draft' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  lastRun?: Date;
  scenarios: StressScenario[];
  portfolioTargets: string[];
  results?: StressTestResults;
  settings: StressTestSettings;
}

interface StressScenario {
  id: string;
  name: string;
  type: 'market_shock' | 'interest_rate' | 'volatility' | 'liquidity' | 'credit' | 'custom';
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  parameters: ScenarioParameter[];
  isEnabled: boolean;
  weight?: number;
}

interface ScenarioParameter {
  asset: string;
  parameter: 'price_change' | 'volatility_change' | 'correlation_change' | 'liquidity_impact';
  value: number;
  unit: 'percentage' | 'basis_points' | 'multiplier';
}

interface StressTestResults {
  totalPnL: number;
  maxDrawdown: number;
  varImpact: number;
  liquidityImpact: number;
  scenarioResults: ScenarioResult[];
  assetBreakdown: AssetResult[];
  riskMetrics: RiskMetrics;
}

interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  pnl: number;
  drawdown: number;
  duration: number;
  confidence: number;
}

interface AssetResult {
  asset: string;
  currentValue: number;
  stressedValue: number;
  pnlImpact: number;
  percentChange: number;
}

interface RiskMetrics {
  portfolioVar: number;
  componentVar: number;
  marginalVar: number;
  correlationBreakdown: number;
}

interface StressTestSettings {
  timeHorizon: number;
  confidenceLevel: number;
  iterations: number;
  rebalancing: boolean;
  includeTransactionCosts: boolean;
  liquidityConstraints: boolean;
}

interface StressTestTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  scenarios: Omit<StressScenario, 'id'>[];
  settings: StressTestSettings;
}

const mockStressTests: StressTest[] = [
  {
    id: 'test-1',
    name: '2008 Financial Crisis Replay',
    description: 'Historical stress test based on 2008 financial crisis scenarios',
    type: 'historical',
    status: 'completed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2),
    portfolioTargets: ['portfolio-001', 'portfolio-002'],
    scenarios: [
      {
        id: 'scenario-1',
        name: 'Equity Market Crash',
        type: 'market_shock',
        severity: 'extreme',
        isEnabled: true,
        parameters: [
          { asset: 'SPY', parameter: 'price_change', value: -40, unit: 'percentage' },
          { asset: 'QQQ', parameter: 'price_change', value: -45, unit: 'percentage' }
        ]
      }
    ],
    settings: {
      timeHorizon: 30,
      confidenceLevel: 95,
      iterations: 10000,
      rebalancing: false,
      includeTransactionCosts: true,
      liquidityConstraints: true
    },
    results: {
      totalPnL: -2456000,
      maxDrawdown: -18.5,
      varImpact: 150,
      liquidityImpact: 25,
      scenarioResults: [
        {
          scenarioId: 'scenario-1',
          scenarioName: 'Equity Market Crash',
          pnl: -2456000,
          drawdown: -18.5,
          duration: 120,
          confidence: 95
        }
      ],
      assetBreakdown: [
        {
          asset: 'AAPL',
          currentValue: 1500000,
          stressedValue: 900000,
          pnlImpact: -600000,
          percentChange: -40
        },
        {
          asset: 'GOOGL',
          currentValue: 2000000,
          stressedValue: 1100000,
          pnlImpact: -900000,
          percentChange: -45
        }
      ],
      riskMetrics: {
        portfolioVar: 1250000,
        componentVar: 980000,
        marginalVar: 270000,
        correlationBreakdown: 85
      }
    }
  },
  {
    id: 'test-2',
    name: 'Interest Rate Shock',
    description: 'Rapid interest rate increase scenario',
    type: 'custom',
    status: 'draft',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    portfolioTargets: ['portfolio-001'],
    scenarios: [
      {
        id: 'scenario-2',
        name: 'Rate Increase',
        type: 'interest_rate',
        severity: 'severe',
        isEnabled: true,
        parameters: [
          { asset: 'TLT', parameter: 'price_change', value: -15, unit: 'percentage' },
          { asset: 'IEF', parameter: 'price_change', value: -8, unit: 'percentage' }
        ]
      }
    ],
    settings: {
      timeHorizon: 7,
      confidenceLevel: 99,
      iterations: 5000,
      rebalancing: true,
      includeTransactionCosts: false,
      liquidityConstraints: false
    }
  }
];

const stressTestTemplates: StressTestTemplate[] = [
  {
    id: 'template-1',
    name: 'Market Crash Scenario',
    description: 'Severe equity market decline with increased volatility',
    type: 'market_shock',
    scenarios: [
      {
        name: 'Equity Crash',
        type: 'market_shock',
        severity: 'severe',
        isEnabled: true,
        parameters: [
          { asset: 'SPY', parameter: 'price_change', value: -30, unit: 'percentage' },
          { asset: 'VIX', parameter: 'volatility_change', value: 200, unit: 'percentage' }
        ]
      }
    ],
    settings: {
      timeHorizon: 30,
      confidenceLevel: 95,
      iterations: 10000,
      rebalancing: false,
      includeTransactionCosts: true,
      liquidityConstraints: true
    }
  },
  {
    id: 'template-2',
    name: 'COVID-19 Style Shock',
    description: 'Pandemic-style market disruption with liquidity issues',
    type: 'historical',
    scenarios: [
      {
        name: 'Market Disruption',
        type: 'liquidity',
        severity: 'extreme',
        isEnabled: true,
        parameters: [
          { asset: 'SPY', parameter: 'price_change', value: -35, unit: 'percentage' },
          { asset: 'ALL', parameter: 'liquidity_impact', value: 50, unit: 'percentage' }
        ]
      }
    ],
    settings: {
      timeHorizon: 60,
      confidenceLevel: 99,
      iterations: 25000,
      rebalancing: true,
      includeTransactionCosts: true,
      liquidityConstraints: true
    }
  }
];

const generateStressTestTrend = () => {
  const data = [];
  for (let i = 30; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    data.push({
      day: day.toLocaleDateString(),
      portfolioValue: 10000000 * (0.8 + Math.random() * 0.4),
      var95: 500000 + Math.random() * 300000,
      maxDrawdown: -5 - Math.random() * 15
    });
  }
  return data;
};

export function StressTestBuilder() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [stressTests, setStressTests] = useState<StressTest[]>(mockStressTests);
  const [selectedTest, setSelectedTest] = useState<StressTest | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [stressTrend] = useState(generateStressTestTrend());

  const performanceMetrics = usePerformanceMonitor('StressTestBuilder');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to stress test updates
    wsClient.subscribe('stress_test.update', (data: any) => {
      if (data.test) {
        setStressTests(prev => prev.map(t => t.id === data.test.id ? data.test : t));
      }
      if (data.progress) {
        setProgress(data.progress);
      }
    });

    return () => {
      wsClient.unsubscribe('stress_test.update');
    };
  }, []);

  const runStressTest = async (testId: string) => {
    setIsRunning(true);
    setProgress(0);
    
    // Simulate stress test execution
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'secondary',
      running: 'default',
      completed: 'secondary',
      failed: 'destructive'
    };
    return <Badge variant={colors[status as keyof typeof colors] as any}>{status}</Badge>;
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      mild: 'text-green-500',
      moderate: 'text-yellow-500',
      severe: 'text-orange-500',
      extreme: 'text-red-500'
    };
    return colors[severity as keyof typeof colors] || 'text-gray-500';
  };

  const testStats = {
    total: stressTests.length,
    completed: stressTests.filter(t => t.status === 'completed').length,
    running: stressTests.filter(t => t.status === 'running').length,
    failed: stressTests.filter(t => t.status === 'failed').length
  };

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TestTube className="h-6 w-6 text-blue-500" />
              Stress Test Builder
            </h2>
            <p className="text-sm text-muted-foreground">
              Design and execute portfolio stress testing scenarios
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Test
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Stress Test</DialogTitle>
                  <DialogDescription>
                    Create a new stress test from a template or start from scratch
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Test Name</Label>
                      <Input placeholder="Enter test name" />
                    </div>
                    <div>
                      <Label>Template</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Start from scratch</SelectItem>
                          {stressTestTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea placeholder="Describe the stress test purpose and methodology" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Test Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="historical">Historical</SelectItem>
                          <SelectItem value="monte_carlo">Monte Carlo</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                          <SelectItem value="regulatory">Regulatory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Portfolio Target</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select portfolio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portfolio-001">Main Portfolio</SelectItem>
                          <SelectItem value="portfolio-002">Growth Portfolio</SelectItem>
                          <SelectItem value="all">All Portfolios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>
                    Create Test
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tests</p>
                  <p className="text-2xl font-bold">{testStats.total}</p>
                </div>
                <TestTube className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-500">{testStats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Running</p>
                  <p className="text-2xl font-bold text-blue-500">{testStats.running}</p>
                </div>
                <Play className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-500">{testStats.failed}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Running Test Progress */}
        {isRunning && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Running Stress Test</h4>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                Executing {selectedTest?.scenarios.length} scenarios with {selectedTest?.settings.iterations} iterations...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Tabs defaultValue="tests" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tests">Stress Tests</TabsTrigger>
                <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
              </TabsList>

              <TabsContent value="tests" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {stressTests.map((test) => (
                      <Card 
                        key={test.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTest?.id === test.id ? 'border-primary' : ''
                        }`}
                        onClick={() => setSelectedTest(test)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{test.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {test.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{test.type}</Badge>
                                {getStatusBadge(test.status)}
                                <span className="text-xs text-muted-foreground">
                                  {test.scenarios.length} scenarios
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Copy test
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Edit test
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={test.status === 'running' ? 'destructive' : 'default'}
                                size="sm"
                                disabled={isRunning}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (test.status !== 'running') {
                                    runStressTest(test.id);
                                  }
                                }}
                              >
                                {test.status === 'running' ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Created:</span>
                              <span>{test.createdAt.toLocaleDateString()}</span>
                            </div>
                            {test.lastRun && (
                              <div className="flex justify-between text-sm">
                                <span>Last Run:</span>
                                <span>{test.lastRun.toLocaleDateString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span>Portfolios:</span>
                              <span>{test.portfolioTargets.length}</span>
                            </div>
                          </div>

                          {test.results && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Total P&L</p>
                                  <p className={`font-medium ${
                                    test.results.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'
                                  }`}>
                                    ${test.results.totalPnL.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Max Drawdown</p>
                                  <p className="font-medium text-red-500">
                                    {test.results.maxDrawdown}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">VaR Impact</p>
                                  <p className="font-medium">
                                    +{test.results.varImpact}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="scenarios" className="space-y-4">
                {selectedTest ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Test Scenarios</h4>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Scenario
                      </Button>
                    </div>
                    <ScrollArea className="h-[550px]">
                      <div className="space-y-3">
                        {selectedTest.scenarios.map((scenario) => (
                          <Card key={scenario.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <Switch checked={scenario.isEnabled} />
                                  <div>
                                    <h5 className="font-medium">{scenario.name}</h5>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline">{scenario.type}</Badge>
                                      <Badge 
                                        variant="outline"
                                        className={getSeverityColor(scenario.severity)}
                                      >
                                        {scenario.severity}
                                      </Badge>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                      {scenario.parameters.map((param, index) => (
                                        <div key={index} className="text-sm text-muted-foreground">
                                          {param.asset}: {param.parameter.replace('_', ' ')} {param.value}
                                          {param.unit === 'percentage' ? '%' : param.unit}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm">
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TestTube className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Select a stress test to view scenarios</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="results" className="space-y-4">
                {selectedTest?.results ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Stress Test Results</CardTitle>
                        <CardDescription>Impact analysis and risk metrics</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Total P&L Impact</p>
                              <p className={`text-2xl font-bold ${
                                selectedTest.results.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                ${selectedTest.results.totalPnL.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Maximum Drawdown</p>
                              <p className="text-2xl font-bold text-red-500">
                                {selectedTest.results.maxDrawdown}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">VaR Impact</p>
                              <p className="text-2xl font-bold">
                                +{selectedTest.results.varImpact}%
                              </p>
                            </div>
                          </div>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={selectedTest.results.scenarioResults}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="scenarioName" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="pnl" fill="#ef4444" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Asset Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {selectedTest.results.assetBreakdown.map((asset) => (
                              <div key={asset.asset} className="flex items-center justify-between py-2 border-b">
                                <div>
                                  <span className="font-medium">{asset.asset}</span>
                                  <div className="text-sm text-muted-foreground">
                                    Current: ${asset.currentValue.toLocaleString()} → 
                                    Stressed: ${asset.stressedValue.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-medium ${
                                    asset.pnlImpact >= 0 ? 'text-green-500' : 'text-red-500'
                                  }`}>
                                    ${asset.pnlImpact.toLocaleString()}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {asset.percentChange}%
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      {selectedTest ? 'No results available - run the stress test' : 'Select a stress test to view results'}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTest ? (
                  <>
                    <div>
                      <Label className="text-sm">Time Horizon (days)</Label>
                      <div className="mt-1">
                        <Slider
                          value={[selectedTest.settings.timeHorizon]}
                          max={365}
                          min={1}
                          step={1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1</span>
                          <span>{selectedTest.settings.timeHorizon}</span>
                          <span>365</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Confidence Level (%)</Label>
                      <div className="mt-1">
                        <Slider
                          value={[selectedTest.settings.confidenceLevel]}
                          max={99.9}
                          min={90}
                          step={0.1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>90%</span>
                          <span>{selectedTest.settings.confidenceLevel}%</span>
                          <span>99.9%</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Iterations</Label>
                      <Input 
                        type="number" 
                        value={selectedTest.settings.iterations}
                        min="1000"
                        max="100000"
                        step="1000"
                      />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Rebalancing</Label>
                        <Switch checked={selectedTest.settings.rebalancing} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Transaction Costs</Label>
                        <Switch checked={selectedTest.settings.includeTransactionCosts} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Liquidity Constraints</Label>
                        <Switch checked={selectedTest.settings.liquidityConstraints} />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select a test to view settings
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {stressTestTemplates.map((template) => (
                      <Card key={template.id} className="p-3 cursor-pointer hover:bg-muted">
                        <h5 className="font-medium text-sm">{template.name}</h5>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {template.type}
                        </Badge>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tests This Month</span>
                  <span className="text-sm font-bold">15</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg Execution Time</span>
                  <span className="text-sm font-bold">2.3min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Worst Case Loss</span>
                  <span className="text-sm font-bold text-red-500">-18.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Success Rate</span>
                  <span className="text-sm font-bold text-green-500">97%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PremiumThemeProvider>
  );
}