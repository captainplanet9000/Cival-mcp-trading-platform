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
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Shield,
  User,
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Lock,
  Unlock
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

interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  category: 'trading' | 'system' | 'compliance' | 'data' | 'access';
  severity: 'info' | 'warning' | 'critical';
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure' | 'partial';
  metadata?: Record<string, any>;
  linkedEvents?: string[];
}

interface AuditFilter {
  dateRange: { from: Date; to: Date };
  users: string[];
  categories: string[];
  severities: string[];
  actions: string[];
  searchQuery: string;
}

interface AuditSummary {
  totalEvents: number;
  uniqueUsers: number;
  criticalEvents: number;
  failedActions: number;
  categories: Record<string, number>;
  topUsers: { userId: string; userName: string; eventCount: number }[];
  recentAlerts: AuditAlert[];
}

interface AuditAlert {
  id: string;
  type: 'anomaly' | 'violation' | 'suspicious';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  status: 'new' | 'investigating' | 'resolved';
}

const mockAuditEvents: AuditEvent[] = [
  {
    id: 'audit-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    userId: 'user-001',
    userName: 'John Trader',
    action: 'order.placed',
    category: 'trading',
    severity: 'info',
    resource: 'Order-12345',
    details: 'Placed limit order for 100 shares of AAPL at $150.00',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    result: 'success',
    metadata: {
      symbol: 'AAPL',
      quantity: 100,
      price: 150.00,
      orderType: 'limit'
    }
  },
  {
    id: 'audit-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    userId: 'user-002',
    userName: 'Jane Admin',
    action: 'user.permission_changed',
    category: 'access',
    severity: 'warning',
    resource: 'User-003',
    details: 'Modified user permissions: Added trading access',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
    result: 'success',
    metadata: {
      targetUser: 'Bob Analyst',
      permissionsAdded: ['trading.execute', 'trading.view'],
      approvedBy: 'Compliance Officer'
    }
  },
  {
    id: 'audit-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    userId: 'user-003',
    userName: 'Bob Analyst',
    action: 'report.exported',
    category: 'data',
    severity: 'info',
    resource: 'Report-Risk-2024-01',
    details: 'Exported risk analysis report to PDF',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    result: 'success',
    metadata: {
      reportType: 'risk_analysis',
      format: 'PDF',
      recordCount: 1523
    }
  },
  {
    id: 'audit-4',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    userId: 'user-001',
    userName: 'John Trader',
    action: 'login.failed',
    category: 'access',
    severity: 'critical',
    resource: 'Authentication',
    details: 'Failed login attempt - invalid credentials',
    ipAddress: '203.0.113.45',
    userAgent: 'Mozilla/5.0 (Unknown)',
    result: 'failure',
    metadata: {
      attemptCount: 3,
      blocked: true,
      location: 'Unknown'
    }
  },
  {
    id: 'audit-5',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    userId: 'system',
    userName: 'System',
    action: 'compliance.check_failed',
    category: 'compliance',
    severity: 'critical',
    resource: 'Portfolio-001',
    details: 'Position size limit exceeded for TSLA',
    ipAddress: '127.0.0.1',
    userAgent: 'System Process',
    result: 'failure',
    metadata: {
      rule: 'position_size_limit',
      currentValue: 12.5,
      limit: 10,
      portfolio: 'Portfolio-001'
    }
  }
];

const generateActivityTrend = () => {
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date();
    hour.setHours(hour.getHours() - i);
    data.push({
      hour: hour.getHours() + ':00',
      events: Math.floor(Math.random() * 100) + 50,
      critical: Math.floor(Math.random() * 5),
      failed: Math.floor(Math.random() * 10)
    });
  }
  return data;
};

const columns: ColumnDef<AuditEvent>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Time',
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.timestamp.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: 'userName',
    header: 'User',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{row.original.userName}</span>
      </div>
    ),
  },
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.action}</Badge>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.category}</Badge>
    ),
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => {
      const severity = row.original.severity;
      const colors = {
        info: 'text-blue-500',
        warning: 'text-yellow-500',
        critical: 'text-red-500'
      };
      return (
        <span className={`text-sm font-medium ${colors[severity]}`}>
          {severity.toUpperCase()}
        </span>
      );
    },
  },
  {
    accessorKey: 'resource',
    header: 'Resource',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.resource}</span>
    ),
  },
  {
    accessorKey: 'result',
    header: 'Result',
    cell: ({ row }) => {
      const result = row.original.result;
      return result === 'success' ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : result === 'failure' ? (
        <XCircle className="h-4 w-4 text-red-500" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
      );
    },
  },
];

export function AuditTrail() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>(mockAuditEvents);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [activityTrend] = useState(generateActivityTrend());
  const [summary] = useState<AuditSummary>({
    totalEvents: 15234,
    uniqueUsers: 42,
    criticalEvents: 23,
    failedActions: 156,
    categories: {
      trading: 8453,
      system: 2341,
      compliance: 1876,
      data: 1523,
      access: 1041
    },
    topUsers: [
      { userId: 'user-001', userName: 'John Trader', eventCount: 3421 },
      { userId: 'user-002', userName: 'Jane Admin', eventCount: 2156 },
      { userId: 'user-003', userName: 'Bob Analyst', eventCount: 1876 }
    ],
    recentAlerts: [
      {
        id: 'alert-1',
        type: 'anomaly',
        message: 'Unusual trading pattern detected for user John Trader',
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
        severity: 'medium',
        status: 'investigating'
      },
      {
        id: 'alert-2',
        type: 'violation',
        message: 'Multiple failed login attempts from unknown IP',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        severity: 'high',
        status: 'new'
      }
    ]
  });

  const performanceMetrics = usePerformanceMonitor('AuditTrail');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to audit events
    wsClient.subscribe('audit.event', (data: any) => {
      if (data.event) {
        setEvents(prev => [data.event, ...prev.slice(0, 999)]);
      }
    });

    return () => {
      wsClient.unsubscribe('audit.event');
    };
  }, []);

  const filteredEvents = events.filter(event => {
    if (selectedCategory !== 'all' && event.category !== selectedCategory) return false;
    if (selectedSeverity !== 'all' && event.severity !== selectedSeverity) return false;
    if (searchQuery && !JSON.stringify(event).toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const table = useReactTable({
    data: filteredEvents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6 text-blue-500" />
              Audit Trail
            </h2>
            <p className="text-sm text-muted-foreground">
              Comprehensive activity logging and security monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events (24h)</p>
                  <p className="text-2xl font-bold">{summary.totalEvents.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{summary.uniqueUsers}</p>
                </div>
                <User className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Events</p>
                  <p className="text-2xl font-bold text-red-500">{summary.criticalEvents}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed Actions</p>
                  <p className="text-2xl font-bold text-orange-500">{summary.failedActions}</p>
                </div>
                <XCircle className="h-8 w-8 text-orange-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts */}
        {summary.recentAlerts.length > 0 && (
          <div className="space-y-2">
            {summary.recentAlerts.map(alert => (
              <Alert key={alert.id} variant={alert.severity === 'high' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Detected</span>
                  <Badge variant={alert.status === 'new' ? 'destructive' : 'secondary'}>
                    {alert.status}
                  </Badge>
                </AlertTitle>
                <AlertDescription>
                  {alert.message} - {alert.timestamp.toLocaleTimeString()}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events">Audit Events</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">User Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="access">Access</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Events Table */}
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
                          onClick={() => setSelectedEvent(row.original)}
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

            {/* Event Details */}
            {selectedEvent && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Event ID</p>
                      <p className="font-mono text-sm">{selectedEvent.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">IP Address</p>
                      <p className="font-mono text-sm">{selectedEvent.ipAddress}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Details</p>
                    <p className="text-sm">{selectedEvent.details}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User Agent</p>
                    <p className="text-sm font-mono">{selectedEvent.userAgent}</p>
                  </div>
                  {selectedEvent.metadata && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Metadata</p>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(selectedEvent.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>24-Hour Activity Trend</CardTitle>
                <CardDescription>Event count by hour with severity breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="events" 
                        stroke="#3b82f6" 
                        name="Total Events"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="critical" 
                        stroke="#ef4444" 
                        name="Critical"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="failed" 
                        stroke="#f59e0b" 
                        name="Failed"
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
                  <CardTitle>Events by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(summary.categories).map(([category, count]) => (
                      <div key={category}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm capitalize">{category}</span>
                          <span className="text-sm font-medium">{count.toLocaleString()}</span>
                        </div>
                        <Progress 
                          value={(count / summary.totalEvents) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.topUsers.map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{user.userName}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {user.eventCount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Access Patterns</CardTitle>
                <CardDescription>Login times and access frequency by user</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { user: 'John T.', morning: 45, afternoon: 78, evening: 23 },
                      { user: 'Jane A.', morning: 67, afternoon: 89, evening: 12 },
                      { user: 'Bob A.', morning: 34, afternoon: 56, evening: 45 },
                      { user: 'Alice M.', morning: 78, afternoon: 45, evening: 34 },
                      { user: 'Charlie D.', morning: 23, afternoon: 67, evening: 89 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="user" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="morning" stackId="a" fill="#3b82f6" name="Morning" />
                      <Bar dataKey="afternoon" stackId="a" fill="#10b981" name="Afternoon" />
                      <Bar dataKey="evening" stackId="a" fill="#f59e0b" name="Evening" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PremiumThemeProvider>
  );
}