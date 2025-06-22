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
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  Target,
  Layers,
  Zap,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  Settings,
  Download,
  Plus,
  Edit3,
  Eye,
  Copy
} from 'lucide-react';
import {
  LineChart, Line,
  BarChart, Bar,
  ScatterChart, Scatter,
  AreaChart, Area,
  ResponsiveContainer,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

interface Scenario {
  id: string;
  name: string;
  description: string;
  category: 'market' | 'economic' | 'geopolitical' | 'regulatory' | 'operational' | 'custom';
  probability: number;
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  variables: ScenarioVariable[];
  results?: ScenarioResults;
  isActive: boolean;
  createdAt: Date;
  lastRun?: Date;
}

interface ScenarioVariable {
  id: string;
  name: string;
  type: 'market_price' | 'interest_rate' | 'volatility' | 'correlation' | 'volume' | 'spread';
  asset?: string;
  currentValue: number;
  scenarioValue: number;
  unit: 'percentage' | 'basis_points' | 'absolute' | 'multiplier';
  confidence: number;
}

interface ScenarioResults {
  portfolioImpact: number;
  varImpact: number;
  liquidityImpact: number;
  timeToRecover: number;
  probabilityAdjustedLoss: number;
  assetImpacts: AssetImpact[];
  sectorImpacts: SectorImpact[];
  riskMetrics: ScenarioRiskMetrics;
}

interface AssetImpact {
  asset: string;
  currentPrice: number;
  scenarioPrice: number;
  priceChange: number;
  valueImpact: number;
  positionSize: number;
}

interface SectorImpact {
  sector: string;
  exposure: number;
  impact: number;
  contribution: number;
}

interface ScenarioRiskMetrics {
  sharpRatio: number;
  maxDrawdown: number;
  volImpact: number;
  correlationShift: number;
}

interface ScenarioComparison {
  baseCase: number;
  scenarios: { name: string; value: number; probability: number }[];
}

const mockScenarios: Scenario[] = [
  {
    id: 'scenario-1',
    name: 'Federal Reserve Rate Hike',
    description: 'Aggressive interest rate increases by Federal Reserve to combat inflation',
    category: 'economic',
    probability: 65,
    timeframe: 'short_term',
    severity: 'high',
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2),
    variables: [
      {
        id: 'var-1',
        name: 'Federal Funds Rate',
        type: 'interest_rate',
        currentValue: 5.25,
        scenarioValue: 7.0,
        unit: 'percentage',
        confidence: 85
      },
      {
        id: 'var-2',
        name: '10Y Treasury Yield',
        type: 'interest_rate',
        currentValue: 4.5,
        scenarioValue: 6.0,
        unit: 'percentage',
        confidence: 80
      }
    ],
    results: {
      portfolioImpact: -8.5,
      varImpact: 45,
      liquidityImpact: 15,
      timeToRecover: 180,
      probabilityAdjustedLoss: -5.5,
      assetImpacts: [
        {
          asset: 'TLT',
          currentPrice: 95.50,
          scenarioPrice: 82.30,
          priceChange: -13.8,
          valueImpact: -276000,
          positionSize: 2000000
        },
        {
          asset: 'REITs',
          currentPrice: 45.20,
          scenarioPrice: 38.90,
          priceChange: -13.9,
          valueImpact: -189000,
          positionSize: 1500000
        }
      ],
      sectorImpacts: [
        { sector: 'Financials', exposure: 25, impact: 12, contribution: 3.0 },
        { sector: 'Real Estate', exposure: 15, impact: -18, contribution: -2.7 },
        { sector: 'Utilities', exposure: 10, impact: -15, contribution: -1.5 }
      ],
      riskMetrics: {
        sharpRatio: -0.15,
        maxDrawdown: -12.5,
        volImpact: 25,
        correlationShift: 0.15
      }
    }
  },
  {
    id: 'scenario-2',
    name: 'Tech Sector Correction',
    description: 'Major correction in technology stocks due to AI bubble concerns',
    category: 'market',
    probability: 40,
    timeframe: 'medium_term',
    severity: 'high',
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    variables: [
      {
        id: 'var-3',
        name: 'NASDAQ-100',
        type: 'market_price',
        currentValue: 16500,
        scenarioValue: 11550,
        unit: 'absolute',
        confidence: 70
      },
      {
        id: 'var-4',
        name: 'Tech Sector Volatility',
        type: 'volatility',
        asset: 'QQQ',
        currentValue: 25,
        scenarioValue: 45,
        unit: 'percentage',
        confidence: 75
      }
    ],
    results: {
      portfolioImpact: -15.2,
      varImpact: 85,
      liquidityImpact: 30,
      timeToRecover: 365,
      probabilityAdjustedLoss: -6.1,
      assetImpacts: [
        {
          asset: 'AAPL',
          currentPrice: 175.00,
          scenarioPrice: 122.50,
          priceChange: -30.0,
          valueImpact: -525000,
          positionSize: 1750000
        },
        {
          asset: 'MSFT',
          currentPrice: 350.00,
          scenarioPrice: 245.00,
          priceChange: -30.0,
          valueImpact: -420000,
          positionSize: 1400000
        }
      ],
      sectorImpacts: [
        { sector: 'Technology', exposure: 35, impact: -30, contribution: -10.5 },
        { sector: 'Communication', exposure: 20, impact: -25, contribution: -5.0 },
        { sector: 'Consumer Discretionary', exposure: 15, impact: -15, contribution: -2.25 }
      ],
      riskMetrics: {
        sharpRatio: -0.25,
        maxDrawdown: -18.7,
        volImpact: 45,
        correlationShift: 0.25
      }
    }
  },
  {
    id: 'scenario-3',
    name: 'Geopolitical Crisis',
    description: 'Escalation of international tensions affecting global markets',
    category: 'geopolitical',
    probability: 30,
    timeframe: 'immediate',
    severity: 'extreme',
    isActive: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    variables: [
      {
        id: 'var-5',
        name: 'VIX Spike',
        type: 'volatility',
        asset: 'VIX',
        currentValue: 18,
        scenarioValue: 65,
        unit: 'absolute',
        confidence: 60
      },
      {
        id: 'var-6',
        name: 'Safe Haven Flow',
        type: 'market_price',
        asset: 'GOLD',
        currentValue: 2000,
        scenarioValue: 2400,
        unit: 'absolute',
        confidence: 85
      }
    ]
  }
];

const generateScenarioComparison = (): ScenarioComparison => ({
  baseCase: 0,
  scenarios: [
    { name: 'Fed Rate Hike', value: -8.5, probability: 65 },
    { name: 'Tech Correction', value: -15.2, probability: 40 },
    { name: 'Geopolitical Crisis', value: -22.8, probability: 30 },
    { name: 'Economic Boom', value: 12.5, probability: 25 },
    { name: 'Recession', value: -18.9, probability: 35 }
  ]
});

const generateScenarioTrend = () => {
  const data = [];
  const scenarios = ['Base Case', 'Rate Hike', 'Tech Correction', 'Crisis'];
  
  for (let i = 30; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const point: any = {
      date: day.toLocaleDateString(),
      'Base Case': 100 + Math.random() * 5
    };
    
    point['Rate Hike'] = point['Base Case'] * (0.92 + Math.random() * 0.05);
    point['Tech Correction'] = point['Base Case'] * (0.85 + Math.random() * 0.08);
    point['Crisis'] = point['Base Case'] * (0.75 + Math.random() * 0.10);
    
    data.push(point);
  }
  return data;
};

export function ScenarioAnalysis() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>(mockScenarios);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [comparison] = useState(generateScenarioComparison());
  const [trendData] = useState(generateScenarioTrend());

  const performanceMetrics = usePerformanceMonitor('ScenarioAnalysis');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to scenario updates
    wsClient.subscribe('scenario.update', (data: any) => {
      if (data.scenario) {
        setScenarios(prev => prev.map(s => s.id === data.scenario.id ? data.scenario : s));
      }
    });

    return () => {
      wsClient.unsubscribe('scenario.update');
    };
  }, []);

  const filteredScenarios = scenarios.filter(scenario => {
    if (selectedCategory !== 'all' && scenario.category !== selectedCategory) return false;
    if (selectedSeverity !== 'all' && scenario.severity !== selectedSeverity) return false;
    return true;
  });

  const scenarioStats = {
    total: scenarios.length,
    active: scenarios.filter(s => s.isActive).length,
    highSeverity: scenarios.filter(s => s.severity === 'high' || s.severity === 'extreme').length,
    recentlyRun: scenarios.filter(s => s.lastRun && s.lastRun > new Date(Date.now() - 1000 * 60 * 60 * 24)).length
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'text-green-500',
      medium: 'text-yellow-500',
      high: 'text-orange-500',
      extreme: 'text-red-500'
    };
    return colors[severity as keyof typeof colors] || 'text-gray-500';
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return 'text-red-500';
    if (probability >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const runScenario = (scenarioId: string) => {
    // Simulate scenario execution
    setScenarios(prev => prev.map(s => 
      s.id === scenarioId 
        ? { ...s, lastRun: new Date() }
        : s
    ));
  };

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-500" />
              Scenario Analysis
            </h2>
            <p className="text-sm text-muted-foreground">
              Model and analyze potential market scenarios and their portfolio impact
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="economic">Economic</SelectItem>
                <SelectItem value="geopolitical">Geopolitical</SelectItem>
                <SelectItem value="regulatory">Regulatory</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="extreme">Extreme</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Scenario
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Scenario</DialogTitle>
                  <DialogDescription>
                    Define a new market scenario for analysis
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Scenario Name</Label>
                      <Input placeholder="Enter scenario name" />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="market">Market</SelectItem>
                          <SelectItem value="economic">Economic</SelectItem>
                          <SelectItem value="geopolitical">Geopolitical</SelectItem>
                          <SelectItem value="regulatory">Regulatory</SelectItem>
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea placeholder="Describe the scenario and its key assumptions" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Probability (%)</Label>
                      <Input type="number" min="0" max="100" placeholder="0-100" />
                    </div>
                    <div>
                      <Label>Timeframe</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="short_term">Short Term</SelectItem>
                          <SelectItem value="medium_term">Medium Term</SelectItem>
                          <SelectItem value="long_term">Long Term</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Severity</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="extreme">Extreme</SelectItem>
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
                    Create Scenario
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
                  <p className="text-sm text-muted-foreground">Total Scenarios</p>
                  <p className="text-2xl font-bold">{scenarioStats.total}</p>
                </div>
                <Layers className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Scenarios</p>
                  <p className="text-2xl font-bold text-green-500">{scenarioStats.active}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Severity</p>
                  <p className="text-2xl font-bold text-red-500">{scenarioStats.highSeverity}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recently Run</p>
                  <p className="text-2xl font-bold text-blue-500">{scenarioStats.recentlyRun}</p>
                </div>
                <PlayCircle className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Tabs defaultValue="scenarios" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>

              <TabsContent value="scenarios" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {filteredScenarios.map((scenario) => (
                      <Card 
                        key={scenario.id}
                        className={`cursor-pointer transition-colors ${
                          selectedScenario?.id === scenario.id ? 'border-primary' : ''
                        } ${!scenario.isActive ? 'opacity-60' : ''}`}
                        onClick={() => setSelectedScenario(scenario)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{scenario.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {scenario.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{scenario.category}</Badge>
                                <Badge variant="outline">{scenario.timeframe.replace('_', ' ')}</Badge>
                                <Badge 
                                  variant="outline"
                                  className={getSeverityColor(scenario.severity)}
                                >
                                  {scenario.severity}
                                </Badge>
                                {!scenario.isActive && (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Edit scenario
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Copy scenario
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  runScenario(scenario.id);
                                }}
                              >
                                <PlayCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Probability</p>
                              <p className={`text-lg font-bold ${getProbabilityColor(scenario.probability)}`}>
                                {scenario.probability}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Variables</p>
                              <p className="text-lg font-bold">{scenario.variables.length}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Last Run</p>
                              <p className="text-lg font-bold">
                                {scenario.lastRun ? scenario.lastRun.toLocaleDateString() : 'Never'}
                              </p>
                            </div>
                          </div>

                          {scenario.results && (
                            <div className="pt-3 border-t">
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Portfolio Impact</p>
                                  <p className={`font-medium ${
                                    scenario.results.portfolioImpact >= 0 ? 'text-green-500' : 'text-red-500'
                                  }`}>
                                    {scenario.results.portfolioImpact}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">VaR Impact</p>
                                  <p className="font-medium">+{scenario.results.varImpact}%</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Recovery Time</p>
                                  <p className="font-medium">{scenario.results.timeToRecover}d</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Adj. Loss</p>
                                  <p className="font-medium text-red-500">
                                    {scenario.results.probabilityAdjustedLoss}%
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

              <TabsContent value="comparison" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio Impact Comparison</CardTitle>
                    <CardDescription>Compare potential impact across different scenarios</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparison.scenarios}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <ReferenceLine y={0} stroke="#000" />
                          <Bar 
                            dataKey="value" 
                            fill={(entry: any) => entry.value >= 0 ? '#10b981' : '#ef4444'}
                            name="Portfolio Impact (%)"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Risk-Adjusted Scenarios</CardTitle>
                    <CardDescription>Portfolio impact adjusted for probability</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart data={comparison.scenarios}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="probability" name="Probability" unit="%" />
                          <YAxis dataKey="value" name="Impact" unit="%" />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter dataKey="value" fill="#3b82f6" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Scenario Evolution</CardTitle>
                    <CardDescription>Portfolio value under different scenarios over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="Base Case" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            name="Base Case"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Rate Hike" 
                            stroke="#f59e0b" 
                            strokeWidth={2}
                            name="Rate Hike"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Tech Correction" 
                            stroke="#ef4444" 
                            strokeWidth={2}
                            name="Tech Correction"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Crisis" 
                            stroke="#dc2626" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Crisis"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {selectedScenario ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Scenario Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedScenario.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Probability</p>
                      <div className="flex items-center gap-2">
                        <Progress value={selectedScenario.probability} className="flex-1" />
                        <span className={`text-sm font-medium ${getProbabilityColor(selectedScenario.probability)}`}>
                          {selectedScenario.probability}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{selectedScenario.createdAt.toLocaleDateString()}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Variables</p>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {selectedScenario.variables.map((variable) => (
                            <div key={variable.id} className="text-xs border rounded p-2">
                              <p className="font-medium">{variable.name}</p>
                              <p className="text-muted-foreground">
                                {variable.currentValue} → {variable.scenarioValue}
                                {variable.unit === 'percentage' ? '%' : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>

                {selectedScenario.results && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Impact Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Portfolio Impact</span>
                        <span className={`text-sm font-bold ${
                          selectedScenario.results.portfolioImpact >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {selectedScenario.results.portfolioImpact}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Max Drawdown</span>
                        <span className="text-sm font-bold text-red-500">
                          {selectedScenario.results.riskMetrics.maxDrawdown}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">VaR Impact</span>
                        <span className="text-sm font-bold">
                          +{selectedScenario.results.varImpact}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Recovery Time</span>
                        <span className="text-sm font-bold">
                          {selectedScenario.results.timeToRecover} days
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Select a scenario to view details</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" size="sm">
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Run All Active
                </Button>
                <Button className="w-full" size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
                <Button className="w-full" size="sm" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Models
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Summary Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Worst Case Loss</span>
                  <span className="text-sm font-bold text-red-500">-22.8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Best Case Gain</span>
                  <span className="text-sm font-bold text-green-500">+12.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Expected Value</span>
                  <span className="text-sm font-bold">-2.3%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Confidence Level</span>
                  <span className="text-sm font-bold">95%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PremiumThemeProvider>
  );
}