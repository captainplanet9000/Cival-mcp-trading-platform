'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Archive,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  Database,
  Calendar
} from 'lucide-react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart, Line,
  BarChart, Bar,
  ResponsiveContainer,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend
} from 'recharts';

interface AuditLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'critical' | 'debug';
  category: 'trading' | 'system' | 'security' | 'data' | 'api' | 'user';
  action: string;
  resource: string;
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  details: string;
  metadata: Record<string, any>;
  source: string;
  correlationId?: string;
}

interface LogFilter {
  dateRange: { from: Date; to: Date };
  levels: string[];
  categories: string[];
  users: string[];
  searchQuery: string;
}

interface LogMetrics {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsByCategory: Record<string, number>;
  recentActivity: ActivityMetric[];
  topUsers: UserActivity[];
  systemHealth: HealthMetric[];
}

interface ActivityMetric {
  hour: string;
  info: number;
  warning: number;
  error: number;
  critical: number;
}

interface UserActivity {
  userId: string;
  userEmail: string;
  logCount: number;
  lastActivity: Date;
}

interface HealthMetric {
  timestamp: Date;
  errorRate: number;
  responseTime: number;
  throughput: number;
}

const mockLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    level: 'info',
    category: 'trading',
    action: 'order.placed',
    resource: 'Order-12345',
    userId: 'solo-operator',
    userEmail: 'trader@local.dev',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    sessionId: 'sess-abc123',
    details: 'Successfully placed limit order for 100 shares of AAPL at $150.00',
    metadata: {
      symbol: 'AAPL',
      quantity: 100,
      price: 150.00,
      orderType: 'limit',
      portfolioId: 'main-portfolio'
    },
    source: 'trading-engine',
    correlationId: 'corr-trading-001'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    level: 'warning',
    category: 'system',
    action: 'performance.degradation',
    resource: 'Trading Engine',
    ipAddress: '127.0.0.1',
    userAgent: 'System Monitor',
    details: 'Trading engine response time increased to 250ms (threshold: 200ms)',
    metadata: {
      responseTime: 250,
      threshold: 200,
      component: 'order-processor',
      loadAverage: 0.85
    },
    source: 'monitoring-service',
    correlationId: 'corr-perf-001'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    level: 'error',
    category: 'api',
    action: 'api.rate_limit_exceeded',
    resource: 'Market Data API',
    userId: 'solo-operator',
    userEmail: 'trader@local.dev',
    ipAddress: '127.0.0.1',
    userAgent: 'Trading Bot v2.1',
    sessionId: 'sess-api-456',
    details: 'Rate limit exceeded for market data requests (limit: 1000/hour)',
    metadata: {
      endpoint: '/api/v1/market/live-data',
      requestCount: 1001,
      limit: 1000,
      resetTime: new Date(Date.now() + 1000 * 60 * 30)
    },
    source: 'api-gateway',
    correlationId: 'corr-api-001'
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    level: 'info',
    category: 'security',
    action: 'auth.login_success',
    resource: 'Authentication Service',
    userId: 'solo-operator',
    userEmail: 'trader@local.dev',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    sessionId: 'sess-abc123',
    details: 'User successfully authenticated via local auth',
    metadata: {
      authMethod: 'local',
      mfaEnabled: false,
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24)
    },
    source: 'auth-service'
  },
  {
    id: 'log-5',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    level: 'critical',
    category: 'data',
    action: 'backup.failed',
    resource: 'Trading Database',
    ipAddress: '127.0.0.1',
    userAgent: 'Backup Service',
    details: 'Automated backup failed due to insufficient disk space',
    metadata: {
      backupType: 'incremental',
      targetPath: '/backups/trading-db',
      availableSpace: '2.1GB',
      requiredSpace: '5.8GB',
      errorCode: 'ENOSPC'
    },
    source: 'backup-service',
    correlationId: 'corr-backup-001'
  }
];

const generateMetrics = (): LogMetrics => {
  const activityData: ActivityMetric[] = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date();
    hour.setHours(hour.getHours() - i);
    activityData.push({
      hour: hour.getHours().toString().padStart(2, '0') + ':00',
      info: Math.floor(Math.random() * 50) + 20,
      warning: Math.floor(Math.random() * 15) + 5,
      error: Math.floor(Math.random() * 8) + 2,
      critical: Math.floor(Math.random() * 3)
    });
  }

  const healthData: HealthMetric[] = [];
  for (let i = 60; i >= 0; i--) {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - i);
    healthData.push({
      timestamp,
      errorRate: Math.random() * 5,
      responseTime: Math.random() * 200 + 50,
      throughput: Math.random() * 1000 + 500
    });
  }

  return {
    totalLogs: 15847,
    logsByLevel: {
      info: 12456,
      warning: 2145,
      error: 987,
      critical: 89,
      debug: 170
    },
    logsByCategory: {
      trading: 8456,
      system: 3421,
      security: 1876,
      data: 1254,
      api: 654,
      user: 186
    },
    recentActivity: activityData,
    topUsers: [
      {
        userId: 'solo-operator',
        userEmail: 'trader@local.dev',
        logCount: 12456,
        lastActivity: new Date(Date.now() - 1000 * 60 * 5)
      },
      {
        userId: 'system',
        userEmail: 'system@local.dev',
        logCount: 3421,
        lastActivity: new Date(Date.now() - 1000 * 60 * 2)
      }
    ],
    systemHealth: healthData
  };
};

const columns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Time',
    cell: ({ row }) => (
      <span className="text-sm font-mono">
        {row.original.timestamp.toLocaleTimeString()}
      </span>
    ),
  },
  {
    accessorKey: 'level',
    header: 'Level',
    cell: ({ row }) => {
      const level = row.original.level;
      const colors = {
        info: 'text-blue-500',
        warning: 'text-yellow-500',
        error: 'text-red-500',
        critical: 'text-red-700',
        debug: 'text-gray-500'
      };
      return (
        <Badge variant="outline" className={colors[level]}>
          {level.toUpperCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.category}</Badge>
    ),
  },
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.action}</span>
    ),
  },
  {
    accessorKey: 'resource',
    header: 'Resource',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.resource}</span>
    ),
  },
  {
    accessorKey: 'userEmail',
    header: 'User',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.userEmail || 'System'}</span>
    ),
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.source}</span>
    ),
  },
];

export function AuditLogging() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>(mockLogs);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [metrics] = useState<LogMetrics>(generateMetrics());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const performanceMetrics = usePerformanceMonitor('AuditLogging');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to new audit logs
    wsClient.subscribe('audit.log', (data: any) => {
      if (data.log) {
        setLogs(prev => [data.log, ...prev.slice(0, 999)]);
      }
    });

    return () => {
      wsClient.unsubscribe('audit.log');
    };
  }, []);

  const filteredLogs = logs.filter(log => {
    if (selectedLevel !== 'all' && log.level !== selectedLevel) return false;
    if (selectedCategory !== 'all' && log.category !== selectedCategory) return false;
    if (searchQuery && !JSON.stringify(log).toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const table = useReactTable({
    data: filteredLogs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const exportLogs = () => {
    // Generate CSV export
    const csv = [
      ['Timestamp', 'Level', 'Category', 'Action', 'Resource', 'User', 'Details'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp.toISOString(),
        log.level,
        log.category,
        log.action,
        log.resource,
        log.userEmail || 'System',
        `"${log.details}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-500" />
              Audit Logging
            </h2>
            <p className="text-sm text-muted-foreground">
              Comprehensive system activity logging and monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold">{metrics.totalLogs.toLocaleString()}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Errors (24h)</p>
                  <p className="text-2xl font-bold text-red-500">{metrics.logsByLevel.error + metrics.logsByLevel.critical}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-500">{metrics.logsByLevel.warning}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Info Logs</p>
                  <p className="text-2xl font-bold text-green-500">{metrics.logsByLevel.info}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Sources</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <Database className="h-8 w-8 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Critical Alerts */}
        {metrics.logsByLevel.critical > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Issues Detected</AlertTitle>
            <AlertDescription>
              {metrics.logsByLevel.critical} critical issue(s) require immediate attention. 
              Check the logs for details and take corrective action.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Tabs defaultValue="logs" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="logs">Audit Logs</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="health">System Health</TabsTrigger>
              </TabsList>

              <TabsContent value="logs" className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="trading">Trading</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="data">Data</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>

                {/* Logs Table */}
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {table.getRowModel().rows?.length ? (
                          table.getRowModel().rows.map((row) => (
                            <TableRow
                              key={row.id}
                              className="cursor-pointer"
                              onClick={() => setSelectedLog(row.original)}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={columns.length}
                              className="h-24 text-center"
                            >
                              No results.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Log Details */}
                {selectedLog && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getLevelIcon(selectedLog.level)}
                        Log Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Timestamp</p>
                          <p className="font-mono text-sm">{selectedLog.timestamp.toISOString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Correlation ID</p>
                          <p className="font-mono text-sm">{selectedLog.correlationId || 'N/A'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Details</p>
                        <p className="text-sm">{selectedLog.details}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">IP Address</p>
                          <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Session ID</p>
                          <p className="font-mono text-sm">{selectedLog.sessionId || 'N/A'}</p>
                        </div>
                      </div>
                      {Object.keys(selectedLog.metadata).length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Metadata</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(selectedLog.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>24-Hour Activity</CardTitle>
                    <CardDescription>Log volume and severity distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.recentActivity}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="info" stackId="a" fill="#3b82f6" name="Info" />
                          <Bar dataKey="warning" stackId="a" fill="#f59e0b" name="Warning" />
                          <Bar dataKey="error" stackId="a" fill="#ef4444" name="Error" />
                          <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Log Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { source: 'trading-engine', count: 4523 },
                          { source: 'api-gateway', count: 3421 },
                          { source: 'auth-service', count: 2187 },
                          { source: 'monitoring-service', count: 1876 },
                          { source: 'backup-service', count: 987 }
                        ].map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm font-mono">{item.source}</span>
                            <span className="text-sm font-medium">{item.count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>User Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {metrics.topUsers.map((user, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div>
                              <span className="text-sm">{user.userEmail}</span>
                              <div className="text-xs text-muted-foreground">
                                Last: {user.lastActivity.toLocaleTimeString()}
                              </div>
                            </div>
                            <span className="text-sm font-medium">
                              {user.logCount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="health" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>System Health Metrics</CardTitle>
                    <CardDescription>Real-time system performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics.systemHealth.slice(-60)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                          />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                          />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="errorRate" 
                            stroke="#ef4444" 
                            name="Error Rate (%)"
                            strokeWidth={2}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="responseTime" 
                            stroke="#3b82f6" 
                            name="Response Time (ms)"
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
            <Card>
              <CardHeader>
                <CardTitle>Log Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(metrics.logsByCategory).map(([category, count]) => (
                  <div key={category}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm capitalize">{category}</span>
                      <span className="text-sm font-medium">{count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(count / metrics.totalLogs) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {logs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-start gap-2 p-2 rounded border">
                        {getLevelIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{log.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Log Processing</span>
                  <span className="text-sm font-bold text-green-500">Healthy</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Storage Usage</span>
                  <span className="text-sm font-bold">2.3GB / 10GB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Retention Period</span>
                  <span className="text-sm font-bold">90 days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Archive Status</span>
                  <span className="text-sm font-bold text-green-500">Up to date</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PremiumThemeProvider>
  );
}