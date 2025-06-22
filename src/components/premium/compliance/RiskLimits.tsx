'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  Shield, 
  Settings, 
  AlertTriangle, 
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  Users,
  Building,
  Target,
  Zap,
  Eye,
  Edit3,
  Plus
} from 'lucide-react';
import {
  LineChart, Line,
  BarChart, Bar,
  ResponsiveContainer,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

interface RiskLimit {
  id: string;
  name: string;
  category: 'position' | 'portfolio' | 'concentration' | 'var' | 'leverage' | 'drawdown';
  type: 'hard' | 'soft' | 'warning';
  scope: 'user' | 'strategy' | 'portfolio' | 'firm';
  targetId?: string;
  targetName?: string;
  metric: string;
  unit: 'percentage' | 'dollar' | 'ratio' | 'count';
  threshold: number;
  currentValue: number;
  utilizationPercent: number;
  isActive: boolean;
  isBreached: boolean;
  lastTriggered?: Date;
  description: string;
  actions: LimitAction[];
  history: LimitHistory[];
}

interface LimitAction {
  type: 'notify' | 'block' | 'liquidate' | 'scale_down' | 'halt_trading';
  parameters?: Record<string, any>;
  isEnabled: boolean;
}

interface LimitHistory {
  timestamp: Date;
  value: number;
  threshold: number;
  breached: boolean;
  action?: string;
}

interface RiskLimitTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultThreshold: number;
  unit: string;
  applicableScopes: string[];
}

interface LimitBreach {
  id: string;
  limitId: string;
  limitName: string;
  timestamp: Date;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  actionsTaken: string[];
  resolvedAt?: Date;
}

const mockLimits: RiskLimit[] = [
  {
    id: 'limit-1',
    name: 'Position Size Limit',
    category: 'position',
    type: 'hard',
    scope: 'portfolio',
    targetId: 'portfolio-001',
    targetName: 'Main Portfolio',
    metric: 'position_size_percentage',
    unit: 'percentage',
    threshold: 10,
    currentValue: 8.5,
    utilizationPercent: 85,
    isActive: true,
    isBreached: false,
    description: 'Maximum position size as percentage of portfolio NAV',
    actions: [
      { type: 'notify', isEnabled: true },
      { type: 'block', isEnabled: true }
    ],
    history: []
  },
  {
    id: 'limit-2',
    name: 'Daily Loss Limit',
    category: 'drawdown',
    type: 'hard',
    scope: 'portfolio',
    targetId: 'portfolio-001',
    targetName: 'Main Portfolio',
    metric: 'daily_pnl_percentage',
    unit: 'percentage',
    threshold: -2.0,
    currentValue: -1.8,
    utilizationPercent: 90,
    isActive: true,
    isBreached: false,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    description: 'Maximum daily loss as percentage of portfolio NAV',
    actions: [
      { type: 'notify', isEnabled: true },
      { type: 'halt_trading', isEnabled: true }
    ],
    history: []
  },
  {
    id: 'limit-3',
    name: 'Leverage Ratio',
    category: 'leverage',
    type: 'soft',
    scope: 'firm',
    metric: 'gross_leverage',
    unit: 'ratio',
    threshold: 3.0,
    currentValue: 2.1,
    utilizationPercent: 70,
    isActive: true,
    isBreached: false,
    description: 'Maximum gross leverage ratio',
    actions: [
      { type: 'notify', isEnabled: true }
    ],
    history: []
  },
  {
    id: 'limit-4',
    name: 'Concentration Risk',
    category: 'concentration',
    type: 'warning',
    scope: 'portfolio',
    targetId: 'portfolio-001',
    targetName: 'Main Portfolio',
    metric: 'sector_concentration',
    unit: 'percentage',
    threshold: 25,
    currentValue: 28,
    utilizationPercent: 112,
    isActive: true,
    isBreached: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 30),
    description: 'Maximum exposure to any single sector',
    actions: [
      { type: 'notify', isEnabled: true }
    ],
    history: []
  },
  {
    id: 'limit-5',
    name: 'VaR Limit',
    category: 'var',
    type: 'hard',
    scope: 'portfolio',
    targetId: 'portfolio-001',
    targetName: 'Main Portfolio',
    metric: 'var_95_1d',
    unit: 'dollar',
    threshold: 50000,
    currentValue: 35000,
    utilizationPercent: 70,
    isActive: true,
    isBreached: false,
    description: '95% 1-day Value at Risk',
    actions: [
      { type: 'notify', isEnabled: true },
      { type: 'scale_down', isEnabled: false }
    ],
    history: []
  }
];

const mockBreaches: LimitBreach[] = [
  {
    id: 'breach-1',
    limitId: 'limit-4',
    limitName: 'Concentration Risk',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    value: 28,
    threshold: 25,
    severity: 'warning',
    status: 'active',
    actionsTaken: ['Email notification sent to risk manager']
  },
  {
    id: 'breach-2',
    limitId: 'limit-2',
    limitName: 'Daily Loss Limit',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    value: -2.1,
    threshold: -2.0,
    severity: 'critical',
    status: 'resolved',
    actionsTaken: ['Trading halted', 'Risk committee notified'],
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
  }
];

const generateUtilizationTrend = () => {
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date();
    hour.setHours(hour.getHours() - i);
    data.push({
      time: hour.getHours() + ':00',
      position: 70 + Math.random() * 30,
      leverage: 60 + Math.random() * 20,
      var: 50 + Math.random() * 40,
      concentration: 40 + Math.random() * 30
    });
  }
  return data;
};

const limitTemplates: RiskLimitTemplate[] = [
  {
    id: 'template-1',
    name: 'Position Size Limit',
    category: 'position',
    description: 'Limits individual position size relative to portfolio',
    defaultThreshold: 10,
    unit: 'percentage',
    applicableScopes: ['portfolio', 'strategy']
  },
  {
    id: 'template-2',
    name: 'Stop Loss',
    category: 'drawdown',
    description: 'Maximum loss threshold for position or portfolio',
    defaultThreshold: -5,
    unit: 'percentage',
    applicableScopes: ['position', 'portfolio', 'strategy']
  },
  {
    id: 'template-3',
    name: 'Leverage Limit',
    category: 'leverage',
    description: 'Maximum leverage ratio allowed',
    defaultThreshold: 2,
    unit: 'ratio',
    applicableScopes: ['portfolio', 'firm']
  }
];

export function RiskLimits() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [limits, setLimits] = useState<RiskLimit[]>(mockLimits);
  const [breaches, setBreaches] = useState<LimitBreach[]>(mockBreaches);
  const [selectedLimit, setSelectedLimit] = useState<RiskLimit | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [utilizationTrend] = useState(generateUtilizationTrend());

  const performanceMetrics = usePerformanceMonitor('RiskLimits');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to risk limit updates
    wsClient.subscribe('risk.limit_update', (data: any) => {
      if (data.limit) {
        setLimits(prev => prev.map(l => l.id === data.limit.id ? data.limit : l));
      }
      if (data.breach) {
        setBreaches(prev => [data.breach, ...prev]);
      }
    });

    return () => {
      wsClient.unsubscribe('risk.limit_update');
    };
  }, []);

  const filteredLimits = limits.filter(limit => {
    if (selectedCategory !== 'all' && limit.category !== selectedCategory) return false;
    if (selectedScope !== 'all' && limit.scope !== selectedScope) return false;
    return true;
  });

  const limitStats = {
    total: limits.length,
    active: limits.filter(l => l.isActive).length,
    breached: limits.filter(l => l.isBreached).length,
    critical: limits.filter(l => l.utilizationPercent > 90).length
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 100) return 'text-red-500';
    if (percent >= 80) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'hard':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'soft':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-500" />
              Risk Limits
            </h2>
            <p className="text-sm text-muted-foreground">
              Monitor and manage risk thresholds and controls
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="position">Position</SelectItem>
                <SelectItem value="portfolio">Portfolio</SelectItem>
                <SelectItem value="concentration">Concentration</SelectItem>
                <SelectItem value="var">VaR</SelectItem>
                <SelectItem value="leverage">Leverage</SelectItem>
                <SelectItem value="drawdown">Drawdown</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedScope} onValueChange={setSelectedScope}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="strategy">Strategy</SelectItem>
                <SelectItem value="portfolio">Portfolio</SelectItem>
                <SelectItem value="firm">Firm</SelectItem>
              </SelectContent>
            </Select>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Limit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Risk Limit</DialogTitle>
                  <DialogDescription>
                    Add a new risk limit from available templates
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Limit Template</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {limitTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Create Limit</Button>
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
                  <p className="text-sm text-muted-foreground">Total Limits</p>
                  <p className="text-2xl font-bold">{limitStats.total}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Limits</p>
                  <p className="text-2xl font-bold text-green-500">{limitStats.active}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Breached</p>
                  <p className="text-2xl font-bold text-red-500">{limitStats.breached}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Utilization</p>
                  <p className="text-2xl font-bold text-yellow-500">{limitStats.critical}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Breaches */}
        {breaches.filter(b => b.status === 'active').length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Active Limit Breaches</AlertTitle>
            <AlertDescription>
              {breaches.filter(b => b.status === 'active').length} risk limit(s) currently breached. 
              Immediate attention required.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="limits" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="limits">Risk Limits</TabsTrigger>
            <TabsTrigger value="breaches">Breaches</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="limits" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className="grid gap-4">
                {filteredLimits.map((limit) => (
                  <Card 
                    key={limit.id}
                    className={`transition-colors ${
                      limit.isBreached ? 'border-red-500' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(limit.type)}
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {limit.name}
                              {!limit.isActive && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                              {limit.isBreached && (
                                <Badge variant="destructive">Breached</Badge>
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {limit.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <Badge variant="outline">{limit.category}</Badge>
                              <Badge variant="secondary">{limit.scope}</Badge>
                              <Badge variant="outline">{limit.type}</Badge>
                              {limit.targetName && (
                                <span className="text-xs text-muted-foreground">
                                  Target: {limit.targetName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLimit(limit);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Switch 
                            checked={limit.isActive}
                            onCheckedChange={(checked) => {
                              setLimits(prev => prev.map(l => 
                                l.id === limit.id ? { ...l, isActive: checked } : l
                              ));
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Value</p>
                          <p className="text-lg font-bold">
                            {limit.unit === 'percentage' ? `${limit.currentValue}%` :
                             limit.unit === 'dollar' ? `$${limit.currentValue.toLocaleString()}` :
                             limit.currentValue}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Threshold</p>
                          <p className="text-lg font-bold">
                            {limit.unit === 'percentage' ? `${limit.threshold}%` :
                             limit.unit === 'dollar' ? `$${limit.threshold.toLocaleString()}` :
                             limit.threshold}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Utilization</p>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={Math.min(limit.utilizationPercent, 100)}
                              className="flex-1"
                            />
                            <span className={`text-sm font-medium ${getUtilizationColor(limit.utilizationPercent)}`}>
                              {limit.utilizationPercent}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {limit.lastTriggered && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground">
                            Last triggered: {limit.lastTriggered.toLocaleString()}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Configured Actions:</p>
                        <div className="flex items-center gap-2">
                          {limit.actions.map((action, index) => (
                            <Badge 
                              key={index}
                              variant={action.isEnabled ? "default" : "outline"}
                              className="text-xs"
                            >
                              {action.type.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="breaches" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {breaches.map((breach) => (
                  <Alert 
                    key={breach.id}
                    variant={breach.severity === 'critical' ? 'destructive' : 'default'}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center justify-between">
                      <span>{breach.limitName} Breach</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={breach.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {breach.severity}
                        </Badge>
                        <Badge variant={breach.status === 'active' ? 'destructive' : 'secondary'}>
                          {breach.status}
                        </Badge>
                      </div>
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      <div className="space-y-2">
                        <p>
                          Value {breach.value} exceeded threshold {breach.threshold} at{' '}
                          {breach.timestamp.toLocaleString()}
                        </p>
                        {breach.actionsTaken.length > 0 && (
                          <div>
                            <p className="font-medium">Actions Taken:</p>
                            <ul className="list-disc list-inside text-sm">
                              {breach.actionsTaken.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {breach.resolvedAt && (
                          <p className="text-sm text-green-600">
                            Resolved at {breach.resolvedAt.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Limit Utilization Trends</CardTitle>
                <CardDescription>24-hour utilization across different limit categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={utilizationTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="5 5" />
                      <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" />
                      <Line 
                        type="monotone" 
                        dataKey="position" 
                        stroke="#3b82f6" 
                        name="Position"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="leverage" 
                        stroke="#10b981" 
                        name="Leverage"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="var" 
                        stroke="#f59e0b" 
                        name="VaR"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="concentration" 
                        stroke="#8b5cf6" 
                        name="Concentration"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Breach Frequency</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { category: 'Position', breaches: 5 },
                        { category: 'Portfolio', breaches: 3 },
                        { category: 'Leverage', breaches: 2 },
                        { category: 'VaR', breaches: 1 },
                        { category: 'Concentration', breaches: 4 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="breaches" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Limit Effectiveness</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Prevented Losses</span>
                    <span className="text-lg font-bold text-green-500">$2.3M</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">False Positives</span>
                    <span className="text-lg font-bold">8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Response Time</span>
                    <span className="text-lg font-bold">0.3s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Coverage</span>
                    <span className="text-lg font-bold">95%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Limit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Risk Limit</DialogTitle>
              <DialogDescription>
                Modify risk limit settings and thresholds
              </DialogDescription>
            </DialogHeader>
            {selectedLimit && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Limit Name</Label>
                    <Input value={selectedLimit.name} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={selectedLimit.category}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="position">Position</SelectItem>
                        <SelectItem value="portfolio">Portfolio</SelectItem>
                        <SelectItem value="concentration">Concentration</SelectItem>
                        <SelectItem value="var">VaR</SelectItem>
                        <SelectItem value="leverage">Leverage</SelectItem>
                        <SelectItem value="drawdown">Drawdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Threshold</Label>
                    <Input 
                      type="number" 
                      value={selectedLimit.threshold}
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select value={selectedLimit.unit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="dollar">Dollar</SelectItem>
                        <SelectItem value="ratio">Ratio</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={selectedLimit.description} />
                </div>
                <Separator />
                <div>
                  <Label className="text-base font-medium">Actions</Label>
                  <div className="space-y-2 mt-2">
                    {selectedLimit.actions.map((action, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="capitalize">{action.type.replace('_', ' ')}</span>
                        <Switch checked={action.isEnabled} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsEditDialogOpen(false)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PremiumThemeProvider>
  );
}