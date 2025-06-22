'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  Activity, 
  Server, 
  Network,
  Zap,
  Settings,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Shield
} from 'lucide-react';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend
} from 'recharts';

interface LoadBalancerNode {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'standby';
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  region: string;
  ipAddress: string;
  port: number;
  weight: number;
  connections: number;
  maxConnections: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
  lastHealthCheck: Date;
  healthScore: number;
}

interface LoadBalancerRule {
  id: string;
  name: string;
  type: 'round_robin' | 'least_connections' | 'weighted' | 'ip_hash' | 'least_response_time';
  isActive: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

interface RuleCondition {
  field: 'url' | 'header' | 'ip' | 'user_agent' | 'geographic';
  operator: 'equals' | 'contains' | 'starts_with' | 'regex' | 'in_range';
  value: string;
}

interface RuleAction {
  type: 'route_to' | 'set_weight' | 'add_header' | 'redirect' | 'block';
  target?: string;
  value?: string;
}

interface TrafficMetrics {
  timestamp: Date;
  totalRequests: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  nodeDistribution: Record<string, number>;
}

interface LoadBalancerConfig {
  algorithm: string;
  sessionAffinity: boolean;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  failoverThreshold: number;
  connectionTimeout: number;
  retryAttempts: number;
  enableCompression: boolean;
  enableCaching: boolean;
  enableSSL: boolean;
}

// Mock data for solo operator with multiple service instances
const mockNodes: LoadBalancerNode[] = [
  {
    id: 'node-1',
    name: 'Trading Engine Primary',
    type: 'primary',
    status: 'active',
    region: 'us-east-1',
    ipAddress: '192.168.1.10',
    port: 8080,
    weight: 100,
    connections: 245,
    maxConnections: 1000,
    responseTime: 85,
    throughput: 1250,
    errorRate: 0.2,
    cpuUsage: 45,
    memoryUsage: 62,
    uptime: 99.95,
    lastHealthCheck: new Date(Date.now() - 30000),
    healthScore: 98
  },
  {
    id: 'node-2',
    name: 'Trading Engine Secondary',
    type: 'secondary',
    status: 'active',
    region: 'us-east-1',
    ipAddress: '192.168.1.11',
    port: 8080,
    weight: 80,
    connections: 156,
    maxConnections: 1000,
    responseTime: 92,
    throughput: 890,
    errorRate: 0.3,
    cpuUsage: 38,
    memoryUsage: 55,
    uptime: 99.8,
    lastHealthCheck: new Date(Date.now() - 25000),
    healthScore: 95
  },
  {
    id: 'node-3',
    name: 'Market Data Service',
    type: 'primary',
    status: 'active',
    region: 'us-west-2',
    ipAddress: '192.168.2.10',
    port: 8081,
    weight: 100,
    connections: 89,
    maxConnections: 500,
    responseTime: 45,
    throughput: 2100,
    errorRate: 0.1,
    cpuUsage: 28,
    memoryUsage: 42,
    uptime: 99.99,
    lastHealthCheck: new Date(Date.now() - 20000),
    healthScore: 99
  },
  {
    id: 'node-4',
    name: 'Risk Engine Standby',
    type: 'standby',
    status: 'inactive',
    region: 'us-east-1',
    ipAddress: '192.168.1.12',
    port: 8082,
    weight: 0,
    connections: 0,
    maxConnections: 800,
    responseTime: 0,
    throughput: 0,
    errorRate: 0,
    cpuUsage: 5,
    memoryUsage: 15,
    uptime: 100,
    lastHealthCheck: new Date(Date.now() - 60000),
    healthScore: 100
  },
  {
    id: 'node-5',
    name: 'Analytics Service',
    type: 'primary',
    status: 'error',
    region: 'us-west-2',
    ipAddress: '192.168.2.11',
    port: 8083,
    weight: 100,
    connections: 23,
    maxConnections: 600,
    responseTime: 250,
    throughput: 120,
    errorRate: 8.5,
    cpuUsage: 85,
    memoryUsage: 92,
    uptime: 95.2,
    lastHealthCheck: new Date(Date.now() - 120000),
    healthScore: 45
  }
];

const mockRules: LoadBalancerRule[] = [
  {
    id: 'rule-1',
    name: 'Trading API Routing',
    type: 'least_response_time',
    isActive: true,
    priority: 1,
    conditions: [
      { field: 'url', operator: 'starts_with', value: '/api/trading' }
    ],
    actions: [
      { type: 'route_to', target: 'trading-pool' }
    ]
  },
  {
    id: 'rule-2',
    name: 'Market Data Load Balancing',
    type: 'round_robin',
    isActive: true,
    priority: 2,
    conditions: [
      { field: 'url', operator: 'contains', value: '/market-data' }
    ],
    actions: [
      { type: 'route_to', target: 'market-data-pool' }
    ]
  },
  {
    id: 'rule-3',
    name: 'Heavy Analytics Requests',
    type: 'weighted',
    isActive: true,
    priority: 3,
    conditions: [
      { field: 'url', operator: 'contains', value: '/analytics' },
      { field: 'header', operator: 'contains', value: 'heavy-computation' }
    ],
    actions: [
      { type: 'route_to', target: 'analytics-pool' },
      { type: 'set_weight', value: '200' }
    ]
  }
];

const generateTrafficMetrics = (): TrafficMetrics[] => {
  const data: TrafficMetrics[] = [];
  const now = new Date();
  
  for (let i = 60; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60000); // 1-minute intervals
    
    data.push({
      timestamp,
      totalRequests: Math.floor(Math.random() * 500) + 1000,
      requestsPerSecond: Math.floor(Math.random() * 50) + 100,
      averageResponseTime: Math.floor(Math.random() * 100) + 50,
      errorRate: Math.random() * 3,
      nodeDistribution: {
        'node-1': Math.random() * 40 + 30,
        'node-2': Math.random() * 30 + 20,
        'node-3': Math.random() * 20 + 15,
        'node-4': 0,
        'node-5': Math.random() * 10 + 5
      }
    });
  }
  
  return data;
};

const mockConfig: LoadBalancerConfig = {
  algorithm: 'least_response_time',
  sessionAffinity: true,
  healthCheckInterval: 30,
  healthCheckTimeout: 5,
  failoverThreshold: 3,
  connectionTimeout: 10,
  retryAttempts: 3,
  enableCompression: true,
  enableCaching: true,
  enableSSL: true
};

export function LoadBalancing() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [nodes, setNodes] = useState<LoadBalancerNode[]>(mockNodes);
  const [rules, setRules] = useState<LoadBalancerRule[]>(mockRules);
  const [config, setConfig] = useState<LoadBalancerConfig>(mockConfig);
  const [trafficMetrics] = useState<TrafficMetrics[]>(generateTrafficMetrics());
  const [selectedNode, setSelectedNode] = useState<LoadBalancerNode | null>(null);
  const [autoRebalance, setAutoRebalance] = useState(true);

  const performanceMetrics = usePerformanceMonitor('LoadBalancing');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to load balancer updates
    wsClient.subscribe('loadbalancer.update', (data: any) => {
      if (data.node) {
        setNodes(prev => prev.map(n => n.id === data.node.id ? { ...n, ...data.node } : n));
      }
    });

    return () => {
      wsClient.unsubscribe('loadbalancer.update');
    };
  }, []);

  // Auto-rebalance simulation
  useEffect(() => {
    if (!autoRebalance) return;

    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => ({
        ...node,
        connections: Math.max(0, node.connections + (Math.random() - 0.5) * 20),
        responseTime: Math.max(10, node.responseTime + (Math.random() - 0.5) * 10),
        cpuUsage: Math.max(0, Math.min(100, node.cpuUsage + (Math.random() - 0.5) * 5)),
        lastHealthCheck: new Date()
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRebalance]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <Pause className="h-4 w-4 text-gray-500" />;
      case 'maintenance':
        return <Settings className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'default',
      inactive: 'secondary',
      maintenance: 'outline',
      error: 'destructive'
    };
    return <Badge variant={colors[status as keyof typeof colors] as any}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      primary: 'default',
      secondary: 'secondary',
      standby: 'outline'
    };
    return <Badge variant={colors[type as keyof typeof colors] as any}>{type}</Badge>;
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const toggleNodeStatus = (nodeId: string) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { 
            ...node, 
            status: node.status === 'active' ? 'inactive' : 'active',
            connections: node.status === 'active' ? 0 : node.connections
          }
        : node
    ));
  };

  const activeNodes = nodes.filter(n => n.status === 'active');
  const totalConnections = activeNodes.reduce((sum, n) => sum + n.connections, 0);
  const avgResponseTime = activeNodes.reduce((sum, n) => sum + n.responseTime, 0) / activeNodes.length;
  const totalThroughput = activeNodes.reduce((sum, n) => sum + n.throughput, 0);

  const latestMetrics = trafficMetrics[trafficMetrics.length - 1];

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Network className="h-6 w-6 text-blue-500" />
              Load Balancing
            </h2>
            <p className="text-sm text-muted-foreground">
              Distribute traffic across multiple service instances for optimal performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-rebalance" className="text-sm">Auto Rebalance</Label>
              <Switch 
                id="auto-rebalance"
                checked={autoRebalance}
                onCheckedChange={setAutoRebalance}
              />
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Nodes</p>
                  <p className="text-2xl font-bold">{activeNodes.length}/{nodes.length}</p>
                </div>
                <Server className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Connections</p>
                  <p className="text-2xl font-bold">{totalConnections}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Throughput</p>
                  <p className="text-2xl font-bold">{totalThroughput.toFixed(0)}/s</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                  <p className="text-2xl font-bold">
                    {(activeNodes.reduce((sum, n) => sum + n.healthScore, 0) / activeNodes.length).toFixed(0)}%
                  </p>
                </div>
                <Shield className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Nodes Alert */}
        {nodes.some(n => n.status === 'error') && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Node Errors Detected</AlertTitle>
            <AlertDescription>
              {nodes.filter(n => n.status === 'error').length} node(s) are experiencing errors. 
              Check configuration and restart if necessary.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Tabs defaultValue="nodes" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="nodes">Nodes</TabsTrigger>
                <TabsTrigger value="traffic">Traffic</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="config">Config</TabsTrigger>
              </TabsList>

              <TabsContent value="nodes" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {nodes.map((node) => (
                      <Card 
                        key={node.id}
                        className={`cursor-pointer transition-colors ${
                          selectedNode?.id === node.id ? 'border-primary' : ''
                        }`}
                        onClick={() => setSelectedNode(node)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              {getStatusIcon(node.status)}
                              <div>
                                <h4 className="font-medium">{node.name}</h4>
                                <p className="text-sm text-muted-foreground font-mono">
                                  {node.ipAddress}:{node.port}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {getTypeBadge(node.type)}
                                  {getStatusBadge(node.status)}
                                  <Badge variant="outline">{node.region}</Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right text-sm">
                                <p className="text-muted-foreground">Health Score</p>
                                <p className={`font-bold ${getHealthColor(node.healthScore)}`}>
                                  {node.healthScore}%
                                </p>
                              </div>
                              <Button
                                variant={node.status === 'active' ? 'destructive' : 'default'}
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleNodeStatus(node.id);
                                }}
                              >
                                {node.status === 'active' ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Connections</p>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={(node.connections / node.maxConnections) * 100} 
                                  className="flex-1 h-2" 
                                />
                                <span className="text-sm font-medium">
                                  {node.connections}/{node.maxConnections}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Response Time</p>
                              <p className="text-lg font-bold">{node.responseTime.toFixed(0)}ms</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Throughput</p>
                              <p className="text-lg font-bold">{node.throughput.toFixed(0)}/s</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Error Rate</p>
                              <p className="text-lg font-bold">{node.errorRate.toFixed(1)}%</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Weight</p>
                              <p className="font-medium">{node.weight}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">CPU Usage</p>
                              <p className="font-medium">{node.cpuUsage.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Memory</p>
                              <p className="font-medium">{node.memoryUsage.toFixed(1)}%</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t mt-3 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">
                                Last health check: {Math.floor((Date.now() - node.lastHealthCheck.getTime()) / 1000)}s ago
                              </span>
                              <span className="text-muted-foreground">
                                Uptime: {node.uptime.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="traffic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Traffic Distribution</CardTitle>
                    <CardDescription>Real-time request distribution across nodes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trafficMetrics.slice(-30)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="requestsPerSecond" 
                            stroke="#3b82f6" 
                            name="Requests/sec"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="averageResponseTime" 
                            stroke="#10b981" 
                            name="Avg Response (ms)"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="errorRate" 
                            stroke="#ef4444" 
                            name="Error Rate (%)"
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
                      <CardTitle>Request Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={Object.entries(latestMetrics.nodeDistribution).map(([node, percentage]) => ({
                                name: nodes.find(n => n.id === node)?.name || node,
                                value: percentage
                              }))}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                            >
                              {Object.entries(latestMetrics.nodeDistribution).map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Current RPS</span>
                        <span className="text-lg font-bold">{latestMetrics.requestsPerSecond}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Avg Response Time</span>
                        <span className="text-lg font-bold">{latestMetrics.averageResponseTime.toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Error Rate</span>
                        <span className="text-lg font-bold text-red-500">{latestMetrics.errorRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Requests (1h)</span>
                        <span className="text-lg font-bold">{latestMetrics.totalRequests.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {rules.map((rule) => (
                      <Card key={rule.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{rule.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{rule.type.replace('_', ' ')}</Badge>
                                <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                                  {rule.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  Priority: {rule.priority}
                                </span>
                              </div>
                            </div>
                            <Switch 
                              checked={rule.isActive}
                              onCheckedChange={(checked) => {
                                setRules(prev => prev.map(r => 
                                  r.id === rule.id ? { ...r, isActive: checked } : r
                                ));
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <div>
                              <p className="text-sm font-medium">Conditions</p>
                              <div className="space-y-1">
                                {rule.conditions.map((condition, index) => (
                                  <div key={index} className="text-sm text-muted-foreground">
                                    {condition.field} {condition.operator} "{condition.value}"
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Actions</p>
                              <div className="space-y-1">
                                {rule.actions.map((action, index) => (
                                  <div key={index} className="text-sm text-muted-foreground">
                                    {action.type.replace('_', ' ')} 
                                    {action.target && ` → ${action.target}`}
                                    {action.value && ` (${action.value})`}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="config" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Load Balancer Configuration</CardTitle>
                    <CardDescription>Global settings and algorithms</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium">Load Balancing Algorithm</Label>
                        <Select value={config.algorithm} onValueChange={(value) => 
                          setConfig(prev => ({ ...prev, algorithm: value }))
                        }>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="round_robin">Round Robin</SelectItem>
                            <SelectItem value="least_connections">Least Connections</SelectItem>
                            <SelectItem value="least_response_time">Least Response Time</SelectItem>
                            <SelectItem value="weighted">Weighted</SelectItem>
                            <SelectItem value="ip_hash">IP Hash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="session-affinity"
                          checked={config.sessionAffinity}
                          onCheckedChange={(checked) => 
                            setConfig(prev => ({ ...prev, sessionAffinity: checked }))
                          }
                        />
                        <Label htmlFor="session-affinity">Enable Session Affinity</Label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">
                          Health Check Interval: {config.healthCheckInterval}s
                        </Label>
                        <Slider
                          value={[config.healthCheckInterval]}
                          onValueChange={([value]) => 
                            setConfig(prev => ({ ...prev, healthCheckInterval: value }))
                          }
                          max={300}
                          min={5}
                          step={5}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Connection Timeout: {config.connectionTimeout}s
                        </Label>
                        <Slider
                          value={[config.connectionTimeout]}
                          onValueChange={([value]) => 
                            setConfig(prev => ({ ...prev, connectionTimeout: value }))
                          }
                          max={60}
                          min={1}
                          step={1}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Failover Threshold: {config.failoverThreshold} failures
                        </Label>
                        <Slider
                          value={[config.failoverThreshold]}
                          onValueChange={([value]) => 
                            setConfig(prev => ({ ...prev, failoverThreshold: value }))
                          }
                          max={10}
                          min={1}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="compression"
                          checked={config.enableCompression}
                          onCheckedChange={(checked) => 
                            setConfig(prev => ({ ...prev, enableCompression: checked }))
                          }
                        />
                        <Label htmlFor="compression">Compression</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="caching"
                          checked={config.enableCaching}
                          onCheckedChange={(checked) => 
                            setConfig(prev => ({ ...prev, enableCaching: checked }))
                          }
                        />
                        <Label htmlFor="caching">Caching</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="ssl"
                          checked={config.enableSSL}
                          onCheckedChange={(checked) => 
                            setConfig(prev => ({ ...prev, enableSSL: checked }))
                          }
                        />
                        <Label htmlFor="ssl">SSL/TLS</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {selectedNode ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Node Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedNode.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-mono text-sm">{selectedNode.ipAddress}:{selectedNode.port}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">{selectedNode.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Region</p>
                      <p className="font-medium">{selectedNode.region}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Health Score</span>
                      <span className={`text-sm font-bold ${getHealthColor(selectedNode.healthScore)}`}>
                        {selectedNode.healthScore}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Uptime</span>
                      <span className="text-sm font-bold">{selectedNode.uptime.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Response Time</span>
                      <span className="text-sm font-bold">{selectedNode.responseTime.toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Error Rate</span>
                      <span className="text-sm font-bold">{selectedNode.errorRate.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Server className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Select a node to view details</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Rebalance Traffic
                </Button>
                <Button className="w-full" size="sm" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Health Check All
                </Button>
                <Button className="w-full" size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Weights
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Algorithm</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-lg font-bold capitalize mb-2">
                    {config.algorithm.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Session affinity: {config.sessionAffinity ? 'Enabled' : 'Disabled'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Health check: {config.healthCheckInterval}s
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PremiumThemeProvider>
  );
}