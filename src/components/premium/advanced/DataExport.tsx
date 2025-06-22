'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  DocumentArrowDownIcon,
  CloudArrowDownIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ChartBarIcon,
  CogIcon,
  CalendarIcon,
  FunnelIcon,
  ShareIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface ExportConfig {
  id: string
  name: string
  description: string
  dataType: 'portfolio' | 'trades' | 'positions' | 'performance' | 'risk' | 'market_data' | 'agents' | 'strategies'
  format: 'csv' | 'excel' | 'pdf' | 'json' | 'xml'
  fields: string[]
  filters: Record<string, any>
  schedule?: {
    frequency: 'manual' | 'daily' | 'weekly' | 'monthly'
    time: string
    timezone: string
    enabled: boolean
  }
  delivery: {
    method: 'download' | 'email' | 'ftp' | 'api'
    destination?: string
    credentials?: Record<string, string>
  }
  compression: boolean
  encryption: boolean
  createdAt: Date
  lastRun?: Date
  status: 'active' | 'paused' | 'error'
}

interface ExportJob {
  id: string
  configId: string
  configName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  startTime: Date
  endTime?: Date
  fileSize?: number
  downloadUrl?: string
  errorMessage?: string
  recordCount?: number
}

const dataTypeFields = {
  portfolio: [
    'symbol', 'quantity', 'avgPrice', 'currentPrice', 'marketValue', 
    'unrealizedPnL', 'realizedPnL', 'totalReturn', 'weight', 'sector'
  ],
  trades: [
    'id', 'timestamp', 'symbol', 'side', 'quantity', 'price', 'value',
    'commission', 'pnl', 'strategy', 'agent', 'orderType', 'status'
  ],
  positions: [
    'symbol', 'quantity', 'entryPrice', 'currentPrice', 'unrealizedPnL',
    'dayChange', 'duration', 'risk', 'allocation', 'beta'
  ],
  performance: [
    'date', 'totalValue', 'dailyReturn', 'cumulativeReturn', 'benchmark',
    'alpha', 'beta', 'sharpeRatio', 'maxDrawdown', 'volatility'
  ],
  risk: [
    'symbol', 'var95', 'var99', 'expectedShortfall', 'beta', 'volatility',
    'concentration', 'liquidity', 'creditRisk', 'operationalRisk'
  ],
  market_data: [
    'symbol', 'timestamp', 'open', 'high', 'low', 'close', 'volume',
    'vwap', 'bid', 'ask', 'spread', 'volatility'
  ],
  agents: [
    'id', 'name', 'type', 'status', 'performance', 'trades', 'pnl',
    'sharpeRatio', 'maxDrawdown', 'winRate', 'profitFactor'
  ],
  strategies: [
    'id', 'name', 'description', 'performance', 'allocation', 'risk',
    'trades', 'winRate', 'avgWin', 'avgLoss', 'profitFactor'
  ]
}

const generateMockConfigs = (): ExportConfig[] => [
  {
    id: '1',
    name: 'Daily Portfolio Report',
    description: 'Complete portfolio snapshot with positions and performance',
    dataType: 'portfolio',
    format: 'excel',
    fields: dataTypeFields.portfolio,
    filters: { dateRange: '1d' },
    schedule: {
      frequency: 'daily',
      time: '18:00',
      timezone: 'UTC',
      enabled: true
    },
    delivery: {
      method: 'email',
      destination: 'reports@example.com'
    },
    compression: true,
    encryption: false,
    createdAt: new Date('2024-01-15'),
    lastRun: new Date(),
    status: 'active'
  },
  {
    id: '2',
    name: 'Trade History Export',
    description: 'All trading activity for compliance reporting',
    dataType: 'trades',
    format: 'csv',
    fields: dataTypeFields.trades,
    filters: { dateRange: '1m' },
    delivery: {
      method: 'download'
    },
    compression: false,
    encryption: true,
    createdAt: new Date('2024-01-20'),
    status: 'active'
  },
  {
    id: '3',
    name: 'Risk Metrics Dashboard',
    description: 'Risk analysis data for external systems',
    dataType: 'risk',
    format: 'json',
    fields: dataTypeFields.risk.slice(0, 6),
    filters: {},
    schedule: {
      frequency: 'weekly',
      time: '09:00',
      timezone: 'UTC',
      enabled: false
    },
    delivery: {
      method: 'api',
      destination: 'https://api.risk-system.com/data'
    },
    compression: true,
    encryption: true,
    createdAt: new Date('2024-02-01'),
    status: 'paused'
  }
]

const generateMockJobs = (): ExportJob[] => [
  {
    id: 'job-1',
    configId: '1',
    configName: 'Daily Portfolio Report',
    status: 'completed',
    progress: 100,
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    fileSize: 2.3 * 1024 * 1024,
    downloadUrl: '/exports/portfolio-2024-02-15.xlsx',
    recordCount: 1247
  },
  {
    id: 'job-2',
    configId: '2',
    configName: 'Trade History Export',
    status: 'running',
    progress: 65,
    startTime: new Date(Date.now() - 15 * 60 * 1000),
    recordCount: 8523
  },
  {
    id: 'job-3',
    configId: '1',
    configName: 'Daily Portfolio Report',
    status: 'failed',
    progress: 0,
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
    errorMessage: 'Database connection timeout'
  }
]

export function DataExport() {
  const { performance } = usePerformanceMonitor('DataExport')
  const wsClient = useTradingWebSocket()
  const [configs, setConfigs] = useState<ExportConfig[]>(generateMockConfigs())
  const [jobs, setJobs] = useState<ExportJob[]>(generateMockJobs())
  const [selectedConfig, setSelectedConfig] = useState<ExportConfig | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newConfig, setNewConfig] = useState<Partial<ExportConfig>>({
    name: '',
    description: '',
    dataType: 'portfolio',
    format: 'csv',
    fields: [],
    filters: {},
    delivery: { method: 'download' },
    compression: false,
    encryption: false
  })

  useEffect(() => {
    // Subscribe to export job updates
    const handleJobUpdate = (data: any) => {
      if (data.type === 'export_progress') {
        setJobs(prev => prev.map(job =>
          job.id === data.jobId ? { ...job, ...data.updates } : job
        ))
      } else if (data.type === 'export_completed') {
        setJobs(prev => prev.map(job =>
          job.id === data.jobId 
            ? { ...job, status: 'completed', progress: 100, endTime: new Date(), ...data.result }
            : job
        ))
      }
    }

    wsClient?.on('export_updates', handleJobUpdate)
    return () => {
      wsClient?.off('export_updates', handleJobUpdate)
    }
  }, [wsClient])

  const createExport = () => {
    const config: ExportConfig = {
      id: `config-${Date.now()}`,
      ...newConfig as ExportConfig,
      createdAt: new Date(),
      status: 'active'
    }
    
    setConfigs([...configs, config])
    setNewConfig({
      name: '',
      description: '',
      dataType: 'portfolio',
      format: 'csv',
      fields: [],
      filters: {},
      delivery: { method: 'download' },
      compression: false,
      encryption: false
    })
    setIsCreating(false)
  }

  const runExport = (configId: string) => {
    const config = configs.find(c => c.id === configId)
    if (!config) return

    const job: ExportJob = {
      id: `job-${Date.now()}`,
      configId,
      configName: config.name,
      status: 'pending',
      progress: 0,
      startTime: new Date()
    }

    setJobs([job, ...jobs])
    
    // Simulate export progress
    setTimeout(() => {
      setJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'running' } : j
      ))
      
      const progressInterval = setInterval(() => {
        setJobs(prev => prev.map(j => {
          if (j.id === job.id && j.progress < 100) {
            const newProgress = Math.min(j.progress + Math.random() * 15, 100)
            if (newProgress >= 100) {
              clearInterval(progressInterval)
              return {
                ...j,
                status: 'completed',
                progress: 100,
                endTime: new Date(),
                fileSize: Math.random() * 5 * 1024 * 1024,
                downloadUrl: `/exports/${config.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${config.format}`,
                recordCount: Math.floor(Math.random() * 10000) + 100
              }
            }
            return { ...j, progress: newProgress }
          }
          return j
        }))
      }, 500)
    }, 1000)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date()
    const diff = endTime.getTime() - start.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DocumentArrowDownIcon className="h-6 w-6" />
              Data Export Center
            </CardTitle>
            <CardDescription>
              Configure and manage data exports for reporting and analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="configs" className="space-y-4">
              <TabsList>
                <TabsTrigger value="configs">Export Configs</TabsTrigger>
                <TabsTrigger value="jobs">
                  Export Jobs
                  <Badge className="ml-2" variant={
                    jobs.some(j => j.status === 'running') ? 'default' : 'outline'
                  }>
                    {jobs.filter(j => j.status === 'running').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="schedule">Scheduled Exports</TabsTrigger>
              </TabsList>

              <TabsContent value="configs" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Export Configurations</h3>
                  <Button onClick={() => setIsCreating(true)}>
                    Create New Export
                  </Button>
                </div>

                {isCreating && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Create Export Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={newConfig.name}
                            onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                            placeholder="Export configuration name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dataType">Data Type</Label>
                          <Select
                            value={newConfig.dataType}
                            onValueChange={(dataType: any) => setNewConfig({ 
                              ...newConfig, 
                              dataType,
                              fields: dataTypeFields[dataType] || []
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="portfolio">Portfolio</SelectItem>
                              <SelectItem value="trades">Trades</SelectItem>
                              <SelectItem value="positions">Positions</SelectItem>
                              <SelectItem value="performance">Performance</SelectItem>
                              <SelectItem value="risk">Risk</SelectItem>
                              <SelectItem value="market_data">Market Data</SelectItem>
                              <SelectItem value="agents">Agents</SelectItem>
                              <SelectItem value="strategies">Strategies</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={newConfig.description}
                          onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                          placeholder="Describe this export configuration"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="format">Format</Label>
                          <Select
                            value={newConfig.format}
                            onValueChange={(format: any) => setNewConfig({ ...newConfig, format })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="csv">CSV</SelectItem>
                              <SelectItem value="excel">Excel</SelectItem>
                              <SelectItem value="pdf">PDF</SelectItem>
                              <SelectItem value="json">JSON</SelectItem>
                              <SelectItem value="xml">XML</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="delivery">Delivery Method</Label>
                          <Select
                            value={newConfig.delivery?.method}
                            onValueChange={(method: any) => setNewConfig({ 
                              ...newConfig, 
                              delivery: { ...newConfig.delivery, method }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="download">Download</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="ftp">FTP</SelectItem>
                              <SelectItem value="api">API</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Options</Label>
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="compression"
                                checked={newConfig.compression}
                                onCheckedChange={(compression) => setNewConfig({ ...newConfig, compression: !!compression })}
                              />
                              <Label htmlFor="compression" className="text-sm">Compress</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="encryption"
                                checked={newConfig.encryption}
                                onCheckedChange={(encryption) => setNewConfig({ ...newConfig, encryption: !!encryption })}
                              />
                              <Label htmlFor="encryption" className="text-sm">Encrypt</Label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {newConfig.dataType && (
                        <div>
                          <Label>Fields to Export</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {dataTypeFields[newConfig.dataType]?.map(field => (
                              <div key={field} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={field}
                                  checked={newConfig.fields?.includes(field)}
                                  onCheckedChange={(checked) => {
                                    const fields = newConfig.fields || []
                                    setNewConfig({
                                      ...newConfig,
                                      fields: checked 
                                        ? [...fields, field]
                                        : fields.filter(f => f !== field)
                                    })
                                  }}
                                />
                                <Label htmlFor={field} className="text-sm">{field}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button onClick={createExport} disabled={!newConfig.name || !newConfig.dataType}>
                          Create Export
                        </Button>
                        <Button variant="outline" onClick={() => setIsCreating(false)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  {configs.map(config => (
                    <Card key={config.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{config.name}</h4>
                              <Badge variant="outline">{config.dataType}</Badge>
                              <Badge variant="outline">{config.format.toUpperCase()}</Badge>
                              <Badge variant={config.status === 'active' ? 'default' : 'secondary'}>
                                {config.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{config.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Fields: {config.fields.length}</span>
                              <span>Delivery: {config.delivery.method}</span>
                              {config.compression && <span>Compressed</span>}
                              {config.encryption && <span>Encrypted</span>}
                              {config.lastRun && <span>Last run: {config.lastRun.toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => runExport(config.id)}>
                              Run Export
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setSelectedConfig(config)}>
                              <CogIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="jobs" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Export Jobs</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {jobs.filter(j => j.status === 'running').length} Running
                    </Badge>
                    <Badge variant="outline">
                      {jobs.filter(j => j.status === 'completed').length} Completed
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {jobs.map(job => (
                      <Card key={job.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{job.configName}</h4>
                                <Badge variant={
                                  job.status === 'completed' ? 'default' :
                                  job.status === 'running' ? 'secondary' :
                                  job.status === 'failed' ? 'destructive' :
                                  'outline'
                                }>
                                  {job.status}
                                </Badge>
                              </div>
                              
                              {job.status === 'running' && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Progress</span>
                                    <span>{job.progress.toFixed(0)}%</span>
                                  </div>
                                  <Progress value={job.progress} />
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="h-3 w-3" />
                                  {formatDuration(job.startTime, job.endTime)}
                                </span>
                                {job.recordCount && (
                                  <span>{job.recordCount.toLocaleString()} records</span>
                                )}
                                {job.fileSize && (
                                  <span>{formatFileSize(job.fileSize)}</span>
                                )}
                                <span>Started: {job.startTime.toLocaleTimeString()}</span>
                              </div>

                              {job.errorMessage && (
                                <Alert className="mt-2">
                                  <ExclamationTriangleIcon className="h-4 w-4" />
                                  <AlertDescription>{job.errorMessage}</AlertDescription>
                                </Alert>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              {job.status === 'completed' && job.downloadUrl && (
                                <Button size="sm" asChild>
                                  <a href={job.downloadUrl} download>
                                    <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                                    Download
                                  </a>
                                </Button>
                              )}
                              {job.status === 'completed' && (
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                              )}
                              {job.status === 'failed' && (
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Scheduled Exports</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {configs.filter(c => c.schedule?.enabled).length} Active Schedules
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {configs.filter(c => c.schedule).map(config => (
                    <Card key={config.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{config.name}</h4>
                              <Badge variant={config.schedule?.enabled ? 'default' : 'secondary'}>
                                {config.schedule?.enabled ? 'Active' : 'Paused'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {config.schedule?.frequency}
                              </span>
                              <span className="flex items-center gap-1">
                                <ClockIcon className="h-3 w-3" />
                                {config.schedule?.time} {config.schedule?.timezone}
                              </span>
                              {config.lastRun && (
                                <span>Last run: {config.lastRun.toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              Edit Schedule
                            </Button>
                            <Button 
                              size="sm" 
                              variant={config.schedule?.enabled ? "destructive" : "default"}
                            >
                              {config.schedule?.enabled ? 'Pause' : 'Resume'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {configs.filter(c => c.schedule).length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <InformationCircleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">No Scheduled Exports</h3>
                        <p className="text-muted-foreground">Configure schedules for your export configurations to automate data delivery</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PremiumThemeProvider>
  )
}