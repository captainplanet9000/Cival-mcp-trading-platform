'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  Activity, 
  Cpu, 
  Database, 
  HardDrive,
  Network,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Settings,
  Monitor
} from 'lucide-react';
import {
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  ResponsiveContainer,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
    processes: number;
  };
  memory: {
    used: number;
    total: number;
    available: number;
    cached: number;
  };
  disk: {
    used: number;
    total: number;
    readSpeed: number;
    writeSpeed: number;
    iops: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    latency: number;
  };
  application: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeConnections: number;
    queueSize: number;
  };
}

interface ComponentMetrics {
  name: string;
  type: 'service' | 'database' | 'cache' | 'queue' | 'external';
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  responseTime: number;
  errorRate: number;
  throughput: number;
  uptime: number;
  lastCheck: Date;
  dependencies: string[];
  alerts: ComponentAlert[];
}

interface ComponentAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

interface BenchmarkResult {
  test: string;
  score: number;
  percentile: number;
  baseline: number;
  improvement: number;
}

const generateSystemMetrics = (): SystemMetrics[] => {
  const data: SystemMetrics[] = [];
  const now = new Date();
  
  for (let i = 120; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 30000); // 30-second intervals
    
    data.push({
      timestamp,
      cpu: {
        usage: 20 + Math.random() * 60 + Math.sin(i / 10) * 15,
        cores: 8,
        temperature: 45 + Math.random() * 20,
        processes: 150 + Math.floor(Math.random() * 50)
      },
      memory: {
        used: 4 + Math.random() * 8,
        total: 16,
        available: 16 - (4 + Math.random() * 8),
        cached: 2 + Math.random() * 3
      },
      disk: {
        used: 250 + Math.random() * 100,
        total: 1000,
        readSpeed: 100 + Math.random() * 200,
        writeSpeed: 80 + Math.random() * 150,
        iops: 1000 + Math.random() * 2000
      },
      network: {
        bytesIn: Math.random() * 1000000,
        bytesOut: Math.random() * 800000,
        packetsIn: Math.random() * 5000,
        packetsOut: Math.random() * 4000,
        latency: 10 + Math.random() * 40
      },
      application: {
        responseTime: 50 + Math.random() * 200,
        throughput: 500 + Math.random() * 1000,
        errorRate: Math.random() * 5,
        activeConnections: 100 + Math.random() * 400,
        queueSize: Math.random() * 50
      }
    });
  }
  
  return data;
};

const mockComponents: ComponentMetrics[] = [
  {
    name: 'Trading Engine',
    type: 'service',
    status: 'healthy',
    responseTime: 85,
    errorRate: 0.2,
    throughput: 1200,
    uptime: 99.95,
    lastCheck: new Date(Date.now() - 30000),
    dependencies: ['Market Data API', 'Order Database', 'Risk Engine'],
    alerts: []
  },
  {
    name: 'Market Data API',
    type: 'external',
    status: 'warning',
    responseTime: 150,
    errorRate: 2.1,
    throughput: 800,
    uptime: 98.5,
    lastCheck: new Date(Date.now() - 45000),
    dependencies: ['External Market Feed'],
    alerts: [
      {
        id: 'alert-1',
        severity: 'warning',
        message: 'Response time above threshold (150ms > 100ms)',
        timestamp: new Date(Date.now() - 60000),
        acknowledged: false
      }
    ]
  },
  {
    name: 'PostgreSQL',
    type: 'database',
    status: 'healthy',
    responseTime: 25,
    errorRate: 0.1,
    throughput: 2500,
    uptime: 99.99,
    lastCheck: new Date(Date.now() - 20000),
    dependencies: [],
    alerts: []
  },
  {
    name: 'Redis Cache',
    type: 'cache',
    status: 'healthy',
    responseTime: 5,
    errorRate: 0.05,
    throughput: 5000,
    uptime: 99.9,
    lastCheck: new Date(Date.now() - 15000),
    dependencies: [],
    alerts: []
  },
  {
    name: 'Message Queue',
    type: 'queue',
    status: 'critical',
    responseTime: 500,
    errorRate: 8.5,
    throughput: 200,
    uptime: 95.2,
    lastCheck: new Date(Date.now() - 120000),
    dependencies: ['Redis Cache'],
    alerts: [
      {
        id: 'alert-2',
        severity: 'critical',
        message: 'Queue backup detected - 500+ pending messages',
        timestamp: new Date(Date.now() - 180000),
        acknowledged: false
      }
    ]
  },
  {
    name: 'Authentication Service',
    type: 'service',
    status: 'healthy',
    responseTime: 45,
    errorRate: 0.3,
    throughput: 300,
    uptime: 99.8,
    lastCheck: new Date(Date.now() - 25000),
    dependencies: ['PostgreSQL'],
    alerts: []
  }
];

const performanceThresholds: PerformanceThreshold[] = [
  { metric: 'CPU Usage', warning: 70, critical: 90, unit: '%' },
  { metric: 'Memory Usage', warning: 80, critical: 95, unit: '%' },
  { metric: 'Disk Usage', warning: 85, critical: 95, unit: '%' },
  { metric: 'Response Time', warning: 200, critical: 500, unit: 'ms' },
  { metric: 'Error Rate', warning: 2, critical: 5, unit: '%' },
  { metric: 'Queue Size', warning: 100, critical: 500, unit: 'items' }
];

const benchmarkResults: BenchmarkResult[] = [
  { test: 'Order Processing', score: 1250, percentile: 95, baseline: 1000, improvement: 25 },
  { test: 'Risk Calculation', score: 850, percentile: 88, baseline: 800, improvement: 6.25 },
  { test: 'Market Data Ingestion', score: 2100, percentile: 92, baseline: 2000, improvement: 5 },
  { test: 'Database Queries', score: 950, percentile: 78, baseline: 1000, improvement: -5 },
  { test: 'WebSocket Connections', score: 1800, percentile: 85, baseline: 1600, improvement: 12.5 }
];

export function PerformanceMetrics() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [systemMetrics] = useState<SystemMetrics[]>(generateSystemMetrics());
  const [components, setComponents] = useState<ComponentMetrics[]>(mockComponents);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  const performanceMonitor = usePerformanceMonitor('PerformanceMetrics');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to performance updates
    wsClient.subscribe('performance.metrics', (data: any) => {
      if (data.component) {
        setComponents(prev => prev.map(c => 
          c.name === data.component.name ? { ...c, ...data.component } : c
        ));
      }
    });

    return () => {
      wsClient.unsubscribe('performance.metrics');
    };
  }, []);

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate metric updates
      setComponents(prev => prev.map(comp => ({
        ...comp,
        responseTime: comp.responseTime + (Math.random() - 0.5) * 20,
        errorRate: Math.max(0, comp.errorRate + (Math.random() - 0.5) * 0.5),
        throughput: comp.throughput + (Math.random() - 0.5) * 100,
        lastCheck: new Date()
      })));
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'offline':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      healthy: 'default',
      warning: 'outline',
      critical: 'destructive',
      offline: 'secondary'
    };
    return <Badge variant={colors[status as keyof typeof colors] as any}>{status}</Badge>;
  };

  const getMetricColor = (value: number, threshold: PerformanceThreshold) => {
    if (value >= threshold.critical) return 'text-red-500';
    if (value >= threshold.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const latestMetrics = systemMetrics[systemMetrics.length - 1];
  const criticalAlerts = components.flatMap(c => c.alerts.filter(a => a.severity === 'critical' && !a.acknowledged));

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-500" />
              Performance Metrics
            </h2>
            <p className="text-sm text-muted-foreground">
              Real-time system performance monitoring and analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
                <SelectItem value="24h">24h</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CPU</p>
                  <p className="text-2xl font-bold">{latestMetrics.cpu.usage.toFixed(1)}%</p>
                </div>
                <Cpu className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
              <Progress value={latestMetrics.cpu.usage} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Memory</p>
                  <p className="text-2xl font-bold">
                    {((latestMetrics.memory.used / latestMetrics.memory.total) * 100).toFixed(1)}%
                  </p>
                </div>
                <Database className="h-8 w-8 text-green-500 opacity-20" />
              </div>
              <Progress 
                value={(latestMetrics.memory.used / latestMetrics.memory.total) * 100} 
                className="mt-2" 
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Disk</p>
                  <p className="text-2xl font-bold">
                    {((latestMetrics.disk.used / latestMetrics.disk.total) * 100).toFixed(1)}%
                  </p>
                </div>
                <HardDrive className="h-8 w-8 text-purple-500 opacity-20" />
              </div>
              <Progress 
                value={(latestMetrics.disk.used / latestMetrics.disk.total) * 100} 
                className="mt-2" 
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Network</p>
                  <p className="text-2xl font-bold">{latestMetrics.network.latency.toFixed(0)}ms</p>
                </div>
                <Network className="h-8 w-8 text-orange-500 opacity-20" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {(latestMetrics.network.bytesIn / 1024 / 1024).toFixed(1)}MB in
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Response</p>
                  <p className="text-2xl font-bold">{latestMetrics.application.responseTime.toFixed(0)}ms</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-500 opacity-20" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {latestMetrics.application.throughput.toFixed(0)} req/s
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Performance Issues</AlertTitle>
            <AlertDescription>
              {criticalAlerts.length} critical performance issue(s) require immediate attention.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Tabs defaultValue="system" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="application">Application</TabsTrigger>
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
              </TabsList>

              <TabsContent value="system" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>System Resource Usage</CardTitle>
                    <CardDescription>Real-time system performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={systemMetrics.slice(-60)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                          />
                          <YAxis domain={[0, 100]} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="cpu.usage" 
                            stroke="#3b82f6" 
                            name="CPU %"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey={(data) => (data.memory.used / data.memory.total) * 100}
                            stroke="#10b981" 
                            name="Memory %"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey={(data) => (data.disk.used / data.disk.total) * 100}
                            stroke="#8b5cf6" 
                            name="Disk %"
                            strokeWidth={2}
                          />
                          <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="5 5" />
                          <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Network Traffic</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={systemMetrics.slice(-30)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="timestamp" 
                              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                            />
                            <YAxis />
                            <Tooltip />
                            <Area 
                              type="monotone" 
                              dataKey="network.bytesIn" 
                              stackId="1"
                              stroke="#3b82f6" 
                              fill="#3b82f6"
                              fillOpacity={0.6}
                              name="Bytes In"
                            />
                            <Area 
                              type="monotone" 
                              dataKey="network.bytesOut" 
                              stackId="1"
                              stroke="#ef4444" 
                              fill="#ef4444"
                              fillOpacity={0.6}
                              name="Bytes Out"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Disk I/O</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={systemMetrics.slice(-30)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="timestamp" 
                              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                            />
                            <YAxis />
                            <Tooltip />
                            <Line 
                              type="monotone" 
                              dataKey="disk.readSpeed" 
                              stroke="#10b981" 
                              name="Read Speed"
                              strokeWidth={2}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="disk.writeSpeed" 
                              stroke="#f59e0b" 
                              name="Write Speed"
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="application" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Application Performance</CardTitle>
                    <CardDescription>Response time, throughput, and error rates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={systemMetrics.slice(-60)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                          />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="application.responseTime" 
                            stroke="#3b82f6" 
                            name="Response Time (ms)"
                            strokeWidth={2}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="application.throughput" 
                            stroke="#10b981" 
                            name="Throughput (req/s)"
                            strokeWidth={2}
                          />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="application.errorRate" 
                            stroke="#ef4444" 
                            name="Error Rate (%)"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="components" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {components.map((component) => (
                      <Card key={component.name}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              {getStatusIcon(component.status)}
                              <div>
                                <h4 className="font-medium">{component.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">{component.type}</Badge>
                                  {getStatusBadge(component.status)}
                                  <span className="text-sm text-muted-foreground">
                                    {component.uptime}% uptime
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <p className="text-muted-foreground">Last Check</p>
                              <p>{Math.floor((Date.now() - component.lastCheck.getTime()) / 1000)}s ago</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Response Time</p>
                              <p className="text-lg font-bold">{component.responseTime.toFixed(0)}ms</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Error Rate</p>
                              <p className="text-lg font-bold">{component.errorRate.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Throughput</p>
                              <p className="text-lg font-bold">{component.throughput.toFixed(0)}/s</p>
                            </div>
                          </div>

                          {component.dependencies.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm text-muted-foreground mb-1">Dependencies</p>
                              <div className="flex flex-wrap gap-1">
                                {component.dependencies.map((dep, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {dep}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {component.alerts.length > 0 && (
                            <div className="space-y-2">
                              {component.alerts.map((alert) => (
                                <Alert 
                                  key={alert.id} 
                                  variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription className="text-sm">
                                    {alert.message}
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {alert.timestamp.toLocaleTimeString()}
                                    </span>
                                  </AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="benchmarks" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Benchmarks</CardTitle>
                    <CardDescription>System performance compared to baseline</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {benchmarkResults.map((result, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{result.test}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {result.percentile}th percentile
                              </Badge>
                              {result.improvement > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Score</p>
                              <p className="font-bold">{result.score}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Baseline</p>
                              <p className="font-bold">{result.baseline}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Improvement</p>
                              <p className={`font-bold ${result.improvement > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {result.improvement > 0 ? '+' : ''}{result.improvement}%
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Progress</p>
                              <Progress 
                                value={Math.min(100, (result.score / result.baseline) * 100)} 
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Thresholds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {performanceThresholds.map((threshold, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">{threshold.metric}</span>
                      <span className="text-sm font-medium">
                        {threshold.critical}{threshold.unit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${(threshold.warning / threshold.critical) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Warning: {threshold.warning}{threshold.unit}</span>
                      <span>Critical: {threshold.critical}{threshold.unit}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Overall Health</span>
                  <span className="text-sm font-bold text-green-500">Excellent</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Components</span>
                  <span className="text-sm font-bold">
                    {components.filter(c => c.status !== 'offline').length}/{components.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Critical Issues</span>
                  <span className="text-sm font-bold text-red-500">{criticalAlerts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg Response Time</span>
                  <span className="text-sm font-bold">{latestMetrics.application.responseTime.toFixed(0)}ms</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" size="sm">
                  <Monitor className="h-4 w-4 mr-2" />
                  View Live Dashboard
                </Button>
                <Button className="w-full" size="sm" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Alerts
                </Button>
                <Button className="w-full" size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PremiumThemeProvider>
  );
}