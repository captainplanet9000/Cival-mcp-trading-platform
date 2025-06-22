'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  CpuChipIcon,
  CloudIcon,
  CodeBracketIcon,
  KeyIcon,
  PlayIcon,
  StopIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  LinkIcon,
  BoltIcon,
  ShieldCheckIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

interface APIEndpoint {
  id: string
  name: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  description: string
  category: 'market_data' | 'trading' | 'portfolio' | 'risk' | 'notifications' | 'analytics'
  authentication: {
    type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth'
    config: Record<string, string>
  }
  headers: Record<string, string>
  parameters: Array<{
    name: string
    type: 'string' | 'number' | 'boolean'
    required: boolean
    description: string
    defaultValue?: any
  }>
  responseFormat: 'json' | 'xml' | 'csv' | 'text'
  rateLimit: {
    requests: number
    period: number // seconds
    burstLimit?: number
  }
  timeout: number
  retries: number
  isActive: boolean
  lastUsed?: Date
  errorCount: number
  successCount: number
}

interface APIConnection {
  id: string
  name: string
  provider: string
  baseUrl: string
  status: 'connected' | 'disconnected' | 'error' | 'testing'
  endpoints: APIEndpoint[]
  credentials: {
    apiKey?: string
    secretKey?: string
    accessToken?: string
    refreshToken?: string
    username?: string
    password?: string
  }
  connectionTest: {
    lastTested?: Date
    success: boolean
    latency?: number
    errorMessage?: string
  }
  usage: {
    requestsToday: number
    requestsThisMonth: number
    dataTransferred: number
    errorRate: number
  }
  createdAt: Date
  updatedAt: Date
}

interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
  deliveryAttempts: number
  successfulDeliveries: number
  failedDeliveries: number
  lastDelivery?: Date
  lastError?: string
}

const generateMockConnections = (): APIConnection[] => [
  {
    id: '1',
    name: 'Binance Trading API',
    provider: 'Binance',
    baseUrl: 'https://api.binance.com',
    status: 'connected',
    endpoints: [
      {
        id: 'binance-ticker',
        name: 'Get Ticker Price',
        url: '/api/v3/ticker/price',
        method: 'GET',
        description: 'Get latest price for a symbol',
        category: 'market_data',
        authentication: { type: 'api_key', config: {} },
        headers: { 'X-MBX-APIKEY': '***' },
        parameters: [
          { name: 'symbol', type: 'string', required: true, description: 'Trading pair symbol' }
        ],
        responseFormat: 'json',
        rateLimit: { requests: 1200, period: 60 },
        timeout: 5000,
        retries: 3,
        isActive: true,
        lastUsed: new Date(),
        errorCount: 2,
        successCount: 1247
      },
      {
        id: 'binance-order',
        name: 'Place Order',
        url: '/api/v3/order',
        method: 'POST',
        description: 'Place a new order',
        category: 'trading',
        authentication: { type: 'api_key', config: {} },
        headers: { 'X-MBX-APIKEY': '***' },
        parameters: [
          { name: 'symbol', type: 'string', required: true, description: 'Trading pair' },
          { name: 'side', type: 'string', required: true, description: 'BUY or SELL' },
          { name: 'type', type: 'string', required: true, description: 'Order type' },
          { name: 'quantity', type: 'number', required: true, description: 'Order quantity' }
        ],
        responseFormat: 'json',
        rateLimit: { requests: 10, period: 1 },
        timeout: 10000,
        retries: 1,
        isActive: true,
        lastUsed: new Date(Date.now() - 30 * 60 * 1000),
        errorCount: 0,
        successCount: 156
      }
    ],
    credentials: {
      apiKey: 'your_api_key_here',
      secretKey: '***'
    },
    connectionTest: {
      lastTested: new Date(),
      success: true,
      latency: 45
    },
    usage: {
      requestsToday: 1403,
      requestsThisMonth: 45672,
      dataTransferred: 12.7 * 1024 * 1024,
      errorRate: 0.14
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Alpha Vantage Market Data',
    provider: 'Alpha Vantage',
    baseUrl: 'https://www.alphavantage.co',
    status: 'connected',
    endpoints: [
      {
        id: 'av-quote',
        name: 'Global Quote',
        url: '/query',
        method: 'GET',
        description: 'Get real-time quote data',
        category: 'market_data',
        authentication: { type: 'api_key', config: {} },
        headers: {},
        parameters: [
          { name: 'function', type: 'string', required: true, description: 'API function', defaultValue: 'GLOBAL_QUOTE' },
          { name: 'symbol', type: 'string', required: true, description: 'Stock symbol' },
          { name: 'apikey', type: 'string', required: true, description: 'API key' }
        ],
        responseFormat: 'json',
        rateLimit: { requests: 5, period: 60 },
        timeout: 15000,
        retries: 2,
        isActive: true,
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
        errorCount: 1,
        successCount: 89
      }
    ],
    credentials: {
      apiKey: 'demo_api_key'
    },
    connectionTest: {
      lastTested: new Date(Date.now() - 30 * 60 * 1000),
      success: true,
      latency: 234
    },
    usage: {
      requestsToday: 23,
      requestsThisMonth: 456,
      dataTransferred: 2.1 * 1024 * 1024,
      errorRate: 1.1
    },
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: '3',
    name: 'Risk Management System',
    provider: 'Internal',
    baseUrl: 'https://risk-api.internal.com',
    status: 'error',
    endpoints: [
      {
        id: 'risk-calc',
        name: 'Calculate VaR',
        url: '/api/v1/risk/var',
        method: 'POST',
        description: 'Calculate Value at Risk for portfolio',
        category: 'risk',
        authentication: { type: 'bearer', config: {} },
        headers: { 'Content-Type': 'application/json' },
        parameters: [
          { name: 'portfolio', type: 'string', required: true, description: 'Portfolio identifier' },
          { name: 'confidence', type: 'number', required: false, description: 'Confidence level', defaultValue: 0.95 },
          { name: 'timeHorizon', type: 'number', required: false, description: 'Time horizon in days', defaultValue: 1 }
        ],
        responseFormat: 'json',
        rateLimit: { requests: 100, period: 3600 },
        timeout: 30000,
        retries: 2,
        isActive: false,
        lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
        errorCount: 15,
        successCount: 234
      }
    ],
    credentials: {
      accessToken: 'bearer_token_here'
    },
    connectionTest: {
      lastTested: new Date(Date.now() - 60 * 60 * 1000),
      success: false,
      errorMessage: 'Connection timeout after 30 seconds'
    },
    usage: {
      requestsToday: 0,
      requestsThisMonth: 234,
      dataTransferred: 5.3 * 1024 * 1024,
      errorRate: 6.4
    },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(Date.now() - 60 * 60 * 1000)
  }
]

const generateMockWebhooks = (): WebhookEndpoint[] => [
  {
    id: '1',
    name: 'Trade Execution Notifications',
    url: 'https://trading-app.com/webhooks/trades',
    events: ['trade.executed', 'trade.filled', 'trade.cancelled'],
    secret: 'webhook_secret_123',
    isActive: true,
    deliveryAttempts: 156,
    successfulDeliveries: 154,
    failedDeliveries: 2,
    lastDelivery: new Date(Date.now() - 15 * 60 * 1000)
  },
  {
    id: '2',
    name: 'Risk Alert System',
    url: 'https://risk-monitor.com/api/alerts',
    events: ['risk.limit_breach', 'risk.var_exceeded', 'risk.margin_call'],
    secret: 'risk_webhook_456',
    isActive: true,
    deliveryAttempts: 23,
    successfulDeliveries: 23,
    failedDeliveries: 0,
    lastDelivery: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: '3',
    name: 'Portfolio Updates',
    url: 'https://dashboard.example.com/portfolio-webhook',
    events: ['portfolio.rebalance', 'portfolio.allocation_change'],
    secret: 'portfolio_secret_789',
    isActive: false,
    deliveryAttempts: 45,
    successfulDeliveries: 42,
    failedDeliveries: 3,
    lastDelivery: new Date(Date.now() - 24 * 60 * 60 * 1000),
    lastError: 'HTTP 404 - Endpoint not found'
  }
]

export function APIIntegration() {
  const { performance } = usePerformanceMonitor('APIIntegration')
  const wsClient = useTradingWebSocket()
  const [connections, setConnections] = useState<APIConnection[]>(generateMockConnections())
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(generateMockWebhooks())
  const [selectedConnection, setSelectedConnection] = useState<APIConnection | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null)
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Subscribe to API updates
    const handleAPIUpdate = (data: any) => {
      if (data.type === 'connection_status') {
        setConnections(prev => prev.map(conn =>
          conn.id === data.connectionId 
            ? { ...conn, status: data.status, ...data.updates }
            : conn
        ))
      }
    }

    wsClient?.on('api_updates', handleAPIUpdate)
    return () => {
      wsClient?.off('api_updates', handleAPIUpdate)
    }
  }, [wsClient])

  const testConnection = async (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId)
    if (!connection) return

    setConnections(prev => prev.map(c =>
      c.id === connectionId ? { ...c, status: 'testing' } : c
    ))

    // Simulate connection test
    setTimeout(() => {
      const success = Math.random() > 0.2 // 80% success rate
      const latency = Math.floor(Math.random() * 500) + 50

      setConnections(prev => prev.map(c =>
        c.id === connectionId 
          ? {
              ...c,
              status: success ? 'connected' : 'error',
              connectionTest: {
                lastTested: new Date(),
                success,
                latency: success ? latency : undefined,
                errorMessage: success ? undefined : 'Connection timeout'
              }
            }
          : c
      ))
    }, 2000)
  }

  const testEndpoint = async (connectionId: string, endpointId: string) => {
    setTestingEndpoint(endpointId)
    
    // Simulate endpoint test
    setTimeout(() => {
      setTestingEndpoint(null)
      // Update endpoint success/error counts
    }, 1500)
  }

  const formatDataSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusColor = (status: APIConnection['status']) => {
    switch (status) {
      case 'connected': return 'text-green-600'
      case 'disconnected': return 'text-gray-600'
      case 'error': return 'text-red-600'
      case 'testing': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: APIConnection['status']) => {
    switch (status) {
      case 'connected': return <CheckCircleIcon className="h-4 w-4" />
      case 'disconnected': return <StopIcon className="h-4 w-4" />
      case 'error': return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'testing': return <ArrowPathIcon className="h-4 w-4 animate-spin" />
      default: return <ClockIcon className="h-4 w-4" />
    }
  }

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CpuChipIcon className="h-6 w-6" />
              API Integration Center
            </CardTitle>
            <CardDescription>
              Manage external API connections, endpoints, and webhooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="connections" className="space-y-4">
              <TabsList>
                <TabsTrigger value="connections">
                  API Connections
                  <Badge className="ml-2" variant="outline">
                    {connections.filter(c => c.status === 'connected').length}/{connections.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
                <TabsTrigger value="webhooks">
                  Webhooks
                  <Badge className="ml-2" variant="outline">
                    {webhooks.filter(w => w.isActive).length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              </TabsList>

              <TabsContent value="connections" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">API Connections</h3>
                  <Button onClick={() => setIsCreating(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Connection
                  </Button>
                </div>

                <div className="space-y-3">
                  {connections.map(connection => (
                    <Card key={connection.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{connection.name}</h4>
                              <Badge variant="outline">{connection.provider}</Badge>
                              <div className={`flex items-center gap-1 ${getStatusColor(connection.status)}`}>
                                {getStatusIcon(connection.status)}
                                <span className="text-sm capitalize">{connection.status}</span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">{connection.baseUrl}</p>
                            
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Endpoints:</span>
                                <span className="ml-1 font-medium">{connection.endpoints.length}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Requests Today:</span>
                                <span className="ml-1 font-medium">{connection.usage.requestsToday.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Error Rate:</span>
                                <span className="ml-1 font-medium">{connection.usage.errorRate.toFixed(1)}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Data:</span>
                                <span className="ml-1 font-medium">{formatDataSize(connection.usage.dataTransferred)}</span>
                              </div>
                            </div>

                            {connection.connectionTest.lastTested && (
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Last tested: {connection.connectionTest.lastTested.toLocaleString()}</span>
                                {connection.connectionTest.latency && (
                                  <span>Latency: {connection.connectionTest.latency}ms</span>
                                )}
                                {connection.connectionTest.errorMessage && (
                                  <span className="text-red-600">{connection.connectionTest.errorMessage}</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testConnection(connection.id)}
                              disabled={connection.status === 'testing'}
                            >
                              {connection.status === 'testing' ? (
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              ) : (
                                <PlayIcon className="h-4 w-4" />
                              )}
                              Test
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedConnection(connection)}
                            >
                              <EyeIcon className="h-4 w-4" />
                              Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="endpoints" className="space-y-4">
                <div className="space-y-4">
                  {connections.map(connection => (
                    <Card key={connection.id}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {connection.name}
                          <Badge variant="outline">{connection.endpoints.length} endpoints</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-3">
                            {connection.endpoints.map(endpoint => (
                              <div key={endpoint.id} className="border rounded p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline">{endpoint.method}</Badge>
                                      <span className="font-medium">{endpoint.name}</span>
                                      <Badge variant={endpoint.isActive ? 'default' : 'secondary'}>
                                        {endpoint.isActive ? 'Active' : 'Inactive'}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">{endpoint.description}</p>
                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {endpoint.method} {connection.baseUrl}{endpoint.url}
                                    </code>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                      <span>Success: {endpoint.successCount}</span>
                                      <span>Errors: {endpoint.errorCount}</span>
                                      <span>Rate Limit: {endpoint.rateLimit.requests}/{endpoint.rateLimit.period}s</span>
                                      {endpoint.lastUsed && (
                                        <span>Last used: {endpoint.lastUsed.toLocaleTimeString()}</span>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => testEndpoint(connection.id, endpoint.id)}
                                    disabled={testingEndpoint === endpoint.id}
                                  >
                                    {testingEndpoint === endpoint.id ? (
                                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <PlayIcon className="h-4 w-4" />
                                    )}
                                    Test
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="webhooks" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Webhook Endpoints</h3>
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Webhook
                  </Button>
                </div>

                <div className="space-y-3">
                  {webhooks.map(webhook => (
                    <Card key={webhook.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{webhook.name}</h4>
                              <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                                {webhook.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">{webhook.url}</p>
                            
                            <div className="flex flex-wrap gap-1 mb-2">
                              {webhook.events.map(event => (
                                <Badge key={event} variant="outline" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Attempts:</span>
                                <span className="ml-1 font-medium">{webhook.deliveryAttempts}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Success Rate:</span>
                                <span className="ml-1 font-medium">
                                  {((webhook.successfulDeliveries / webhook.deliveryAttempts) * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Last Delivery:</span>
                                <span className="ml-1 font-medium">
                                  {webhook.lastDelivery?.toLocaleTimeString() || 'Never'}
                                </span>
                              </div>
                            </div>

                            {webhook.lastError && (
                              <Alert className="mt-2">
                                <ExclamationTriangleIcon className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                  {webhook.lastError}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Test webhook delivery
                              }}
                            >
                              <PlayIcon className="h-4 w-4" />
                              Test
                            </Button>
                            <Button size="sm" variant="outline">
                              <EyeIcon className="h-4 w-4" />
                              Logs
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="monitoring" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Active Connections</p>
                          <p className="text-2xl font-bold text-green-600">
                            {connections.filter(c => c.status === 'connected').length}
                          </p>
                        </div>
                        <CheckCircleIcon className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Requests Today</p>
                          <p className="text-2xl font-bold">
                            {connections.reduce((sum, c) => sum + c.usage.requestsToday, 0).toLocaleString()}
                          </p>
                        </div>
                        <BoltIcon className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Error Rate</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {(connections.reduce((sum, c) => sum + c.usage.errorRate, 0) / connections.length).toFixed(1)}%
                          </p>
                        </div>
                        <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Data Transferred</p>
                          <p className="text-2xl font-bold">
                            {formatDataSize(connections.reduce((sum, c) => sum + c.usage.dataTransferred, 0))}
                          </p>
                        </div>
                        <CloudIcon className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>API Usage by Connection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {connections.map(connection => {
                        const totalRequests = connections.reduce((sum, c) => sum + c.usage.requestsToday, 0)
                        const percentage = totalRequests > 0 ? (connection.usage.requestsToday / totalRequests) * 100 : 0
                        
                        return (
                          <div key={connection.id} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{connection.name}</span>
                              <span>{connection.usage.requestsToday.toLocaleString()} requests</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Connection Details Dialog */}
        {selectedConnection && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {selectedConnection.name} - Connection Details
                <Button variant="outline" onClick={() => setSelectedConnection(null)}>
                  ✕
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Provider</Label>
                    <Input value={selectedConnection.provider} readOnly />
                  </div>
                  <div>
                    <Label>Base URL</Label>
                    <Input value={selectedConnection.baseUrl} readOnly />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    Credentials
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCredentials(prev => ({
                        ...prev,
                        [selectedConnection.id]: !prev[selectedConnection.id]
                      }))}
                    >
                      {showCredentials[selectedConnection.id] ? (
                        <EyeSlashIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </Label>
                  <Textarea
                    value={JSON.stringify(
                      showCredentials[selectedConnection.id] 
                        ? selectedConnection.credentials
                        : Object.keys(selectedConnection.credentials).reduce((acc, key) => ({
                            ...acc,
                            [key]: '***'
                          }), {}),
                      null,
                      2
                    )}
                    readOnly
                    className="h-24 font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Created</Label>
                    <Input value={selectedConnection.createdAt.toLocaleDateString()} readOnly />
                  </div>
                  <div>
                    <Label>Last Updated</Label>
                    <Input value={selectedConnection.updatedAt.toLocaleDateString()} readOnly />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PremiumThemeProvider>
  )
}