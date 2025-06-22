'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  HeartIcon,
  CpuChipIcon,
  CircleStackIcon,
  CloudIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BoltIcon,
  SignalIcon,
  ServerIcon,
  EyeIcon,
  ArrowPathIcon,
  WifiIcon,
  ChartBarIcon
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
  Filler
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface SystemMetrics {
  timestamp: Date
  cpu: {
    usage: number
    cores: number
    temperature: number
    loadAverage: number[]
  }
  memory: {
    used: number
    total: number
    available: number
    percentage: number
    swap: {
      used: number
      total: number
    }
  }
  disk: {
    used: number
    total: number
    percentage: number
    iops: number
    latency: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    packetsIn: number
    packetsOut: number
    latency: number
    connections: number
  }
  database: {
    connections: number
    activeQueries: number
    avgResponseTime: number
    deadlocks: number
    cacheHitRatio: number
  }
  application: {
    uptime: number
    requestsPerSecond: number
    avgResponseTime: number
    errorRate: number
    activeUsers: number
    queueLength: number
  }
}

interface ServiceHealth {
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'offline'
  uptime: number
  lastCheck: Date
  responseTime: number
  errorCount: number
  dependencies: string[]
  endpoint: string
  version: string
  description: string
}

interface Alert {
  id: string
  type: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  component: string
  timestamp: Date
  acknowledged: boolean
  resolvedAt?: Date
  metadata?: Record<string, any>
}

const generateMockMetrics = (): SystemMetrics => ({
  timestamp: new Date(),
  cpu: {
    usage: Math.random() * 40 + 30, // 30-70%
    cores: 8,
    temperature: Math.random() * 20 + 45, // 45-65°C
    loadAverage: [
      Math.random() * 2 + 1,
      Math.random() * 2 + 1,
      Math.random() * 2 + 1
    ]
  },
  memory: {
    used: 12.5 * 1024 * 1024 * 1024, // 12.5GB
    total: 32 * 1024 * 1024 * 1024, // 32GB
    available: 19.5 * 1024 * 1024 * 1024,
    percentage: 39,
    swap: {
      used: 2.1 * 1024 * 1024 * 1024,
      total: 8 * 1024 * 1024 * 1024
    }
  },
  disk: {
    used: 450 * 1024 * 1024 * 1024, // 450GB
    total: 1024 * 1024 * 1024 * 1024, // 1TB
    percentage: 44,
    iops: Math.floor(Math.random() * 5000) + 1000,
    latency: Math.random() * 10 + 2
  },
  network: {
    bytesIn: Math.floor(Math.random() * 100000000),
    bytesOut: Math.floor(Math.random() * 50000000),
    packetsIn: Math.floor(Math.random() * 10000),
    packetsOut: Math.floor(Math.random() * 8000),
    latency: Math.random() * 50 + 10,
    connections: Math.floor(Math.random() * 200) + 50
  },
  database: {
    connections: Math.floor(Math.random() * 50) + 25,
    activeQueries: Math.floor(Math.random() * 20) + 5,
    avgResponseTime: Math.random() * 100 + 20,
    deadlocks: Math.floor(Math.random() * 3),
    cacheHitRatio: Math.random() * 0.1 + 0.9 // 90-100%
  },
  application: {
    uptime: 15 * 24 * 60 * 60, // 15 days
    requestsPerSecond: Math.floor(Math.random() * 500) + 100,
    avgResponseTime: Math.random() * 200 + 50,
    errorRate: Math.random() * 2, // 0-2%
    activeUsers: Math.floor(Math.random() * 100) + 50,
    queueLength: Math.floor(Math.random() * 10)
  }
})

const generateMockServices = (): ServiceHealth[] => [
  {
    name: 'Trading Engine',
    status: 'healthy',
    uptime: 99.98,
    lastCheck: new Date(),
    responseTime: 45,
    errorCount: 0,
    dependencies: ['Database', 'Market Data Feed'],
    endpoint: '/api/v1/health/trading',
    version: '2.1.4',
    description: 'Core trading execution engine'
  },
  {
    name: 'Market Data Feed',
    status: 'healthy',
    uptime: 99.95,
    lastCheck: new Date(Date.now() - 30000),
    responseTime: 23,
    errorCount: 2,
    dependencies: ['External APIs'],
    endpoint: '/api/v1/health/market-data',
    version: '1.8.2',
    description: 'Real-time market data ingestion'
  },
  {
    name: 'Risk Management',
    status: 'warning',
    uptime: 99.87,
    lastCheck: new Date(Date.now() - 60000),
    responseTime: 156,
    errorCount: 5,
    dependencies: ['Database', 'Portfolio Service'],
    endpoint: '/api/v1/health/risk',
    version: '3.0.1',
    description: 'Portfolio risk monitoring and alerts'
  },
  {
    name: 'Portfolio Service',
    status: 'healthy',
    uptime: 99.99,
    lastCheck: new Date(Date.now() - 15000),
    responseTime: 34,
    errorCount: 0,
    dependencies: ['Database'],
    endpoint: '/api/v1/health/portfolio',
    version: '2.5.7',
    description: 'Portfolio management and analytics'
  },
  {
    name: 'Authentication Service',
    status: 'healthy',
    uptime: 99.96,
    lastCheck: new Date(Date.now() - 45000),
    responseTime: 67,
    errorCount: 1,
    dependencies: ['Database', 'External Auth'],
    endpoint: '/api/v1/health/auth',
    version: '1.4.3',
    description: 'User authentication and authorization'
  },
  {
    name: 'Notification Service',
    status: 'critical',
    uptime: 98.45,
    lastCheck: new Date(Date.now() - 120000),
    responseTime: 2345,
    errorCount: 23,
    dependencies: ['Email Service', 'SMS Gateway'],
    endpoint: '/api/v1/health/notifications',
    version: '1.2.1',
    description: 'Alert and notification delivery'
  }
]

const generateMockAlerts = (): Alert[] => [
  {
    id: '1',
    type: 'critical',
    title: 'Notification Service Down',
    message: 'Notification service is experiencing high latency and connection timeouts',
    component: 'notification-service',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    acknowledged: false,
    metadata: { responseTime: 2345, errorRate: 45.2 }
  },
  {
    id: '2',
    type: 'warning',
    title: 'High Memory Usage',
    message: 'System memory usage has exceeded 85% threshold',
    component: 'system',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    acknowledged: true,
    metadata: { memoryUsage: 87.3, threshold: 85 }
  },
  {
    id: '3',
    type: 'warning',
    title: 'Risk Service Latency',
    message: 'Risk management service response time above normal range',
    component: 'risk-service',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    acknowledged: false,
    metadata: { responseTime: 156, threshold: 100 }
  },
  {
    id: '4',
    type: 'info',
    title: 'Scheduled Maintenance',
    message: 'Database maintenance window scheduled for tomorrow 2:00 AM UTC',
    component: 'database',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    acknowledged: true
  }
]

export function SystemHealth() {
  const { performance } = usePerformanceMonitor('SystemHealth')
  const wsClient = useTradingWebSocket()
  const [metrics, setMetrics] = useState<SystemMetrics>(generateMockMetrics())
  const [services, setServices] = useState<ServiceHealth[]>(generateMockServices())
  const [alerts, setAlerts] = useState<Alert[]>(generateMockAlerts())
  const [metricsHistory, setMetricsHistory] = useState<SystemMetrics[]>([])
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('1h')

  useEffect(() => {
    // Generate initial metrics history
    const history = Array.from({ length: 60 }, (_, i) => ({
      ...generateMockMetrics(),
      timestamp: new Date(Date.now() - (59 - i) * 60 * 1000)
    }))
    setMetricsHistory(history)

    // Subscribe to real-time updates
    const handleHealthUpdate = (data: any) => {
      if (data.type === 'system_metrics') {
        setMetrics(data.metrics)
        setMetricsHistory(prev => [...prev.slice(-59), data.metrics])
      } else if (data.type === 'service_health') {
        setServices(prev => prev.map(service =>
          service.name === data.serviceName ? { ...service, ...data.health } : service
        ))
      } else if (data.type === 'system_alert') {
        setAlerts(prev => [data.alert, ...prev])
      }
    }

    wsClient?.on('health_updates', handleHealthUpdate)

    // Simulate real-time updates
    const interval = setInterval(() => {
      const newMetrics = generateMockMetrics()
      setMetrics(newMetrics)
      setMetricsHistory(prev => [...prev.slice(-59), newMetrics])
    }, 30000)

    return () => {
      wsClient?.off('health_updates', handleHealthUpdate)
      clearInterval(interval)
    }
  }, [wsClient])

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((seconds % (60 * 60)) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const getStatusColor = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      case 'offline': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon className="h-4 w-4" />
      case 'warning': return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'critical': return <XCircleIcon className="h-4 w-4" />
      case 'offline': return <XCircleIcon className="h-4 w-4" />
      default: return <ClockIcon className="h-4 w-4" />
    }
  }

  const getCpuChartData = () => ({
    labels: metricsHistory.map(m => m.timestamp.toLocaleTimeString()),
    datasets: [{
      label: 'CPU Usage (%)',
      data: metricsHistory.map(m => m.cpu.usage),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  })

  const getMemoryChartData = () => ({
    labels: metricsHistory.map(m => m.timestamp.toLocaleTimeString()),
    datasets: [{
      label: 'Memory Usage (%)',
      data: metricsHistory.map(m => m.memory.percentage),
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4
    }]
  })

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartIcon className="h-6 w-6" />
              System Health Dashboard
            </CardTitle>
            <CardDescription>
              Real-time monitoring of system performance and service health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="metrics">System Metrics</TabsTrigger>
                <TabsTrigger value="services">
                  Services
                  <Badge className="ml-2" variant={
                    services.some(s => s.status === 'critical') ? 'destructive' :
                    services.some(s => s.status === 'warning') ? 'default' :
                    'outline'
                  }>
                    {services.filter(s => s.status === 'healthy').length}/{services.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="alerts">
                  Alerts
                  <Badge className="ml-2" variant="destructive">
                    {alerts.filter(a => !a.acknowledged).length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">CPU Usage</p>
                          <p className="text-2xl font-bold">{metrics.cpu.usage.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">
                            {metrics.cpu.cores} cores
                          </p>
                        </div>
                        <CpuChipIcon className="h-8 w-8 text-blue-500" />
                      </div>
                      <Progress value={metrics.cpu.usage} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Memory</p>
                          <p className="text-2xl font-bold">{metrics.memory.percentage}%</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
                          </p>
                        </div>
                        <CircleStackIcon className="h-8 w-8 text-green-500" />
                      </div>
                      <Progress value={metrics.memory.percentage} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Disk Usage</p>
                          <p className="text-2xl font-bold">{metrics.disk.percentage}%</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(metrics.disk.used)} / {formatBytes(metrics.disk.total)}
                          </p>
                        </div>
                        <ServerIcon className="h-8 w-8 text-purple-500" />
                      </div>
                      <Progress value={metrics.disk.percentage} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Uptime</p>
                          <p className="text-2xl font-bold">99.8%</p>
                          <p className="text-xs text-muted-foreground">
                            {formatUptime(metrics.application.uptime)}
                          </p>
                        </div>
                        <CheckCircleIcon className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Service Status Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Service Status Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {services.map(service => (
                        <div key={service.name} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <div className={getStatusColor(service.status)}>
                              {getStatusIcon(service.status)}
                            </div>
                            <div>
                              <div className="font-medium">{service.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {service.responseTime}ms • {service.uptime.toFixed(2)}% uptime
                              </div>
                            </div>
                          </div>
                          <Badge variant={
                            service.status === 'healthy' ? 'default' :
                            service.status === 'warning' ? 'secondary' :
                            'destructive'
                          }>
                            {service.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {alerts.slice(0, 5).map(alert => (
                          <Alert key={alert.id} className={
                            alert.type === 'critical' ? 'border-red-500' :
                            alert.type === 'warning' ? 'border-yellow-500' :
                            alert.type === 'error' ? 'border-orange-500' :
                            'border-blue-500'
                          }>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <AlertDescription>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={
                                      alert.type === 'critical' ? 'destructive' :
                                      alert.type === 'warning' ? 'default' :
                                      alert.type === 'error' ? 'secondary' :
                                      'outline'
                                    }>
                                      {alert.type}
                                    </Badge>
                                    <span className="font-medium">{alert.title}</span>
                                  </div>
                                  <p className="text-sm">{alert.message}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {alert.timestamp.toLocaleString()} • {alert.component}
                                  </p>
                                </AlertDescription>
                              </div>
                              {!alert.acknowledged && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => acknowledgeAlert(alert.id)}
                                >
                                  Acknowledge
                                </Button>
                              )}
                            </div>
                          </Alert>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="metrics" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>CPU Usage History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <Line
                          data={getCpuChartData()}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                  callback: function(value) {
                                    return value + '%'
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
                      <CardTitle>Memory Usage History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <Line
                          data={getMemoryChartData()}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                  callback: function(value) {
                                    return value + '%'
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <WifiIcon className="h-5 w-5" />
                        Network
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Bytes In</span>
                        <span className="font-mono text-sm">{formatBytes(metrics.network.bytesIn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Bytes Out</span>
                        <span className="font-mono text-sm">{formatBytes(metrics.network.bytesOut)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Latency</span>
                        <span className="font-mono text-sm">{metrics.network.latency.toFixed(1)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Connections</span>
                        <span className="font-mono text-sm">{metrics.network.connections}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CircleStackIcon className="h-5 w-5" />
                        Database
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Connections</span>
                        <span className="font-mono text-sm">{metrics.database.connections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Active Queries</span>
                        <span className="font-mono text-sm">{metrics.database.activeQueries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Response</span>
                        <span className="font-mono text-sm">{metrics.database.avgResponseTime.toFixed(1)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Cache Hit Ratio</span>
                        <span className="font-mono text-sm">{(metrics.database.cacheHitRatio * 100).toFixed(1)}%</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BoltIcon className="h-5 w-5" />
                        Application
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Requests/sec</span>
                        <span className="font-mono text-sm">{metrics.application.requestsPerSecond}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Response</span>
                        <span className="font-mono text-sm">{metrics.application.avgResponseTime.toFixed(1)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Error Rate</span>
                        <span className="font-mono text-sm">{metrics.application.errorRate.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Active Users</span>
                        <span className="font-mono text-sm">{metrics.application.activeUsers}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-4">
                <div className="space-y-4">
                  {services.map(service => (
                    <Card key={service.name}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={getStatusColor(service.status)}>
                                {getStatusIcon(service.status)}
                              </div>
                              <h3 className="font-semibold">{service.name}</h3>
                              <Badge variant="outline">{service.version}</Badge>
                              <Badge variant={
                                service.status === 'healthy' ? 'default' :
                                service.status === 'warning' ? 'secondary' :
                                'destructive'
                              }>
                                {service.status}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Uptime:</span>
                                <span className="ml-1 font-medium">{service.uptime.toFixed(2)}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Response Time:</span>
                                <span className="ml-1 font-medium">{service.responseTime}ms</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Errors:</span>
                                <span className="ml-1 font-medium">{service.errorCount}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Last Check:</span>
                                <span className="ml-1 font-medium">{service.lastCheck.toLocaleTimeString()}</span>
                              </div>
                            </div>

                            <div className="mt-3">
                              <span className="text-sm text-muted-foreground">Dependencies: </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {service.dependencies.map(dep => (
                                  <Badge key={dep} variant="outline" className="text-xs">
                                    {dep}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <EyeIcon className="h-4 w-4" />
                              Logs
                            </Button>
                            <Button size="sm" variant="outline">
                              <ArrowPathIcon className="h-4 w-4" />
                              Restart
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="alerts" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">System Alerts</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Mark All Read
                    </Button>
                    <Button variant="outline" size="sm">
                      Configure Alerts
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {alerts.map(alert => (
                      <Alert key={alert.id} className={
                        alert.type === 'critical' ? 'border-red-500' :
                        alert.type === 'error' ? 'border-orange-500' :
                        alert.type === 'warning' ? 'border-yellow-500' :
                        'border-blue-500'
                      }>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={
                                alert.type === 'critical' ? 'destructive' :
                                alert.type === 'error' ? 'default' :
                                alert.type === 'warning' ? 'secondary' :
                                'outline'
                              }>
                                {alert.type}
                              </Badge>
                              <span className="font-semibold">{alert.title}</span>
                            </div>
                            <AlertDescription className="mb-2">
                              {alert.message}
                            </AlertDescription>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Component: {alert.component}</span>
                              <span>Time: {alert.timestamp.toLocaleString()}</span>
                              {alert.metadata && (
                                <span>Details: {JSON.stringify(alert.metadata)}</span>
                              )}
                            </div>
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
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PremiumThemeProvider>
  )
}