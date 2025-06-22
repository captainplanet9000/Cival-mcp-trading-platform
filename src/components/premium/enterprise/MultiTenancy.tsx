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
import { ScrollArea } from '@/components/ui/scroll-area';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  Building2, 
  Users, 
  Database,
  Settings,
  BarChart3,
  Cpu,
  HardDrive,
  Network,
  Shield,
  Zap
} from 'lucide-react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend
} from 'recharts';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  userCount: number;
  dataUsage: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  createdAt: Date;
  lastActivity: Date;
  limits: TenantLimits;
  features: TenantFeatures;
}

interface TenantLimits {
  maxUsers: number;
  maxPortfolios: number;
  maxStrategies: number;
  maxApiCalls: number;
  maxStorageGB: number;
  maxCpuHours: number;
}

interface TenantFeatures {
  realTimeData: boolean;
  advancedAnalytics: boolean;
  multiAssetTrading: boolean;
  riskManagement: boolean;
  compliance: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  ssoIntegration: boolean;
}

interface ResourceUsage {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  database: number;
}

interface TenantMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  totalUsers: number;
  totalRevenue: number;
  resourceUtilization: ResourceUsage;
  growthMetrics: GrowthMetric[];
  planDistribution: PlanDistribution[];
}

interface GrowthMetric {
  date: string;
  newTenants: number;
  activeUsers: number;
  revenue: number;
}

interface PlanDistribution {
  plan: string;
  count: number;
  revenue: number;
  percentage: number;
}

// Mock data for solo operator with multiple trading environments/contexts
const mockTenants: Tenant[] = [
  {
    id: 'main',
    name: 'Main Trading Environment',
    domain: 'main.trading.local',
    plan: 'enterprise',
    status: 'active',
    userCount: 1,
    dataUsage: 85,
    cpuUsage: 45,
    memoryUsage: 62,
    storageUsage: 38,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90),
    lastActivity: new Date(Date.now() - 1000 * 60 * 5),
    limits: {
      maxUsers: 1,
      maxPortfolios: 50,
      maxStrategies: 100,
      maxApiCalls: 100000,
      maxStorageGB: 1000,
      maxCpuHours: 10000
    },
    features: {
      realTimeData: true,
      advancedAnalytics: true,
      multiAssetTrading: true,
      riskManagement: true,
      compliance: true,
      apiAccess: true,
      customBranding: true,
      ssoIntegration: true
    }
  },
  {
    id: 'testing',
    name: 'Testing Environment',
    domain: 'test.trading.local',
    plan: 'professional',
    status: 'active',
    userCount: 1,
    dataUsage: 35,
    cpuUsage: 15,
    memoryUsage: 28,
    storageUsage: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
    lastActivity: new Date(Date.now() - 1000 * 60 * 30),
    limits: {
      maxUsers: 1,
      maxPortfolios: 20,
      maxStrategies: 50,
      maxApiCalls: 50000,
      maxStorageGB: 500,
      maxCpuHours: 5000
    },
    features: {
      realTimeData: true,
      advancedAnalytics: true,
      multiAssetTrading: true,
      riskManagement: false,
      compliance: false,
      apiAccess: true,
      customBranding: false,
      ssoIntegration: false
    }
  },
  {
    id: 'development',
    name: 'Development Environment',
    domain: 'dev.trading.local',
    plan: 'basic',
    status: 'active',
    userCount: 1,
    dataUsage: 15,
    cpuUsage: 8,
    memoryUsage: 18,
    storageUsage: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2),
    limits: {
      maxUsers: 1,
      maxPortfolios: 5,
      maxStrategies: 10,
      maxApiCalls: 10000,
      maxStorageGB: 100,
      maxCpuHours: 1000
    },
    features: {
      realTimeData: false,
      advancedAnalytics: false,
      multiAssetTrading: false,
      riskManagement: false,
      compliance: false,
      apiAccess: true,
      customBranding: false,
      ssoIntegration: false
    }
  }
];

const generateMetrics = (): TenantMetrics => {
  const growthData = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    growthData.push({
      date: date.toLocaleDateString(),
      newTenants: Math.floor(Math.random() * 3),
      activeUsers: Math.floor(Math.random() * 5) + 5,
      revenue: Math.floor(Math.random() * 1000) + 2000
    });
  }

  return {
    totalTenants: mockTenants.length,
    activeTenants: mockTenants.filter(t => t.status === 'active').length,
    trialTenants: mockTenants.filter(t => t.status === 'trial').length,
    totalUsers: mockTenants.reduce((sum, t) => sum + t.userCount, 0),
    totalRevenue: 15000,
    resourceUtilization: {
      cpu: 45,
      memory: 62,
      storage: 38,
      network: 28,
      database: 55
    },
    growthMetrics: growthData,
    planDistribution: [
      { plan: 'Enterprise', count: 1, revenue: 10000, percentage: 66.7 },
      { plan: 'Professional', count: 1, revenue: 4000, percentage: 26.7 },
      { plan: 'Basic', count: 1, revenue: 1000, percentage: 6.6 }
    ]
  };
};

export function MultiTenancy() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [tenants] = useState<Tenant[]>(mockTenants);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [metrics] = useState<TenantMetrics>(generateMetrics());

  const performanceMetrics = usePerformanceMonitor('MultiTenancy');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to tenant updates
    wsClient.subscribe('tenant.update', (data: any) => {
      // Handle tenant updates
    });

    return () => {
      wsClient.unsubscribe('tenant.update');
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'default',
      suspended: 'destructive',
      trial: 'secondary'
    };
    return <Badge variant={colors[status as keyof typeof colors] as any}>{status}</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      basic: 'outline',
      professional: 'secondary',
      enterprise: 'default'
    };
    return <Badge variant={colors[plan as keyof typeof colors] as any}>{plan}</Badge>;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-500" />
              Multi-Tenancy Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage multiple trading environments and resource allocation
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Environments</p>
                  <p className="text-2xl font-bold">{metrics.totalTenants}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CPU Usage</p>
                  <p className="text-2xl font-bold">{metrics.resourceUtilization.cpu}%</p>
                </div>
                <Cpu className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Memory</p>
                  <p className="text-2xl font-bold">{metrics.resourceUtilization.memory}%</p>
                </div>
                <Database className="h-8 w-8 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Storage</p>
                  <p className="text-2xl font-bold">{metrics.resourceUtilization.storage}%</p>
                </div>
                <HardDrive className="h-8 w-8 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Network</p>
                  <p className="text-2xl font-bold">{metrics.resourceUtilization.network}%</p>
                </div>
                <Network className="h-8 w-8 text-indigo-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Tabs defaultValue="environments" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="environments">Environments</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="environments" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {tenants.map((tenant) => (
                      <Card 
                        key={tenant.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTenant?.id === tenant.id ? 'border-primary' : ''
                        }`}
                        onClick={() => setSelectedTenant(tenant)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{tenant.name}</h4>
                              <p className="text-sm text-muted-foreground">{tenant.domain}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {getPlanBadge(tenant.plan)}
                                {getStatusBadge(tenant.status)}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Last Activity</p>
                              <p className="text-sm font-medium">
                                {Math.floor((Date.now() - tenant.lastActivity.getTime()) / (1000 * 60))}m ago
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-muted-foreground">CPU</p>
                              <div className="flex items-center gap-2">
                                <Progress value={tenant.cpuUsage} className="flex-1 h-2" />
                                <span className={`text-sm font-medium ${getUsageColor(tenant.cpuUsage)}`}>
                                  {tenant.cpuUsage}%
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Memory</p>
                              <div className="flex items-center gap-2">
                                <Progress value={tenant.memoryUsage} className="flex-1 h-2" />
                                <span className={`text-sm font-medium ${getUsageColor(tenant.memoryUsage)}`}>
                                  {tenant.memoryUsage}%
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Storage</p>
                              <div className="flex items-center gap-2">
                                <Progress value={tenant.storageUsage} className="flex-1 h-2" />
                                <span className={`text-sm font-medium ${getUsageColor(tenant.storageUsage)}`}>
                                  {tenant.storageUsage}%
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Data Usage</p>
                              <div className="flex items-center gap-2">
                                <Progress value={tenant.dataUsage} className="flex-1 h-2" />
                                <span className={`text-sm font-medium ${getUsageColor(tenant.dataUsage)}`}>
                                  {tenant.dataUsage}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <span>Portfolios: {Math.floor(Math.random() * tenant.limits.maxPortfolios)}/{tenant.limits.maxPortfolios}</span>
                            <span>Strategies: {Math.floor(Math.random() * tenant.limits.maxStrategies)}/{tenant.limits.maxStrategies}</span>
                            <span>API Calls: {Math.floor(tenant.limits.maxApiCalls * 0.8).toLocaleString()}/{tenant.limits.maxApiCalls.toLocaleString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="resources" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Resource Utilization</CardTitle>
                    <CardDescription>System resource usage across all environments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { resource: 'CPU', usage: metrics.resourceUtilization.cpu, limit: 100 },
                          { resource: 'Memory', usage: metrics.resourceUtilization.memory, limit: 100 },
                          { resource: 'Storage', usage: metrics.resourceUtilization.storage, limit: 100 },
                          { resource: 'Network', usage: metrics.resourceUtilization.network, limit: 100 },
                          { resource: 'Database', usage: metrics.resourceUtilization.database, limit: 100 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="resource" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="usage" fill="#3b82f6" />
                          <Bar dataKey="limit" fill="#e5e7eb" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Environment Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={metrics.planDistribution}
                              dataKey="count"
                              nameKey="plan"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label
                            >
                              {metrics.planDistribution.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={['#3b82f6', '#10b981', '#f59e0b'][index % 3]} 
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
                      <CardTitle>Resource Alerts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                        <span className="text-sm">Memory usage approaching limit</span>
                        <Badge variant="outline" className="text-yellow-600">Warning</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">All environments healthy</span>
                        <Badge variant="outline" className="text-green-600">OK</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <span className="text-sm">Auto-scaling available</span>
                        <Badge variant="outline" className="text-blue-600">Info</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Trends</CardTitle>
                    <CardDescription>Environment usage and activity over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics.growthMetrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="activeUsers" 
                            stroke="#3b82f6" 
                            name="Active Users"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="newTenants" 
                            stroke="#10b981" 
                            name="New Environments"
                            strokeWidth={2}
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
            {selectedTenant ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Environment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedTenant.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="font-medium capitalize">{selectedTenant.plan}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{selectedTenant.createdAt.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Domain</p>
                      <p className="font-medium font-mono text-sm">{selectedTenant.domain}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resource Limits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Max Portfolios</span>
                      <span className="text-sm font-bold">{selectedTenant.limits.maxPortfolios}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Max Strategies</span>
                      <span className="text-sm font-bold">{selectedTenant.limits.maxStrategies}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Max API Calls</span>
                      <span className="text-sm font-bold">{selectedTenant.limits.maxApiCalls.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Max Storage</span>
                      <span className="text-sm font-bold">{selectedTenant.limits.maxStorageGB}GB</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Max CPU Hours</span>
                      <span className="text-sm font-bold">{selectedTenant.limits.maxCpuHours.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Real-time Data</span>
                      <Switch checked={selectedTenant.features.realTimeData} disabled />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Advanced Analytics</span>
                      <Switch checked={selectedTenant.features.advancedAnalytics} disabled />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Multi-Asset Trading</span>
                      <Switch checked={selectedTenant.features.multiAssetTrading} disabled />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Risk Management</span>
                      <Switch checked={selectedTenant.features.riskManagement} disabled />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Compliance</span>
                      <Switch checked={selectedTenant.features.compliance} disabled />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">API Access</span>
                      <Switch checked={selectedTenant.features.apiAccess} disabled />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Select an environment to view details</p>
                </CardContent>
              </Card>
            )}

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
                  <span className="text-sm">Uptime</span>
                  <span className="text-sm font-bold">99.9%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Response Time</span>
                  <span className="text-sm font-bold">&lt; 100ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Environments</span>
                  <span className="text-sm font-bold">{metrics.activeTenants}/{metrics.totalTenants}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PremiumThemeProvider>
  );
}