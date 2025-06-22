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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  Squares2X2Icon,
  PlusIcon,
  CogIcon,
  EyeIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  PaintBrushIcon,
  AdjustmentsHorizontalIcon,
  BookmarkIcon,
  UserIcon,
  GlobeAltIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'

interface DashboardWidget {
  id: string
  type: 'chart' | 'metric' | 'table' | 'gauge' | 'alert' | 'news' | 'order' | 'position'
  title: string
  dataSource: string
  config: Record<string, any>
  position: { x: number; y: number; w: number; h: number }
  style: {
    backgroundColor?: string
    borderColor?: string
    textColor?: string
    fontSize?: string
  }
  filters: Record<string, any>
  refreshInterval: number
  isVisible: boolean
}

interface DashboardLayout {
  id: string
  name: string
  description: string
  widgets: DashboardWidget[]
  theme: 'light' | 'dark' | 'trading'
  layout: 'grid' | 'freeform' | 'columns'
  isPublic: boolean
  isTemplate: boolean
  category: 'trading' | 'portfolio' | 'risk' | 'analytics' | 'custom'
  tags: string[]
  createdAt: Date
  updatedAt: Date
  createdBy: string
  usage: number
}

const widgetTypes = [
  { value: 'chart', label: 'Chart', icon: '📊', description: 'Line, bar, pie charts' },
  { value: 'metric', label: 'Metric', icon: '📈', description: 'Key performance indicators' },
  { value: 'table', label: 'Table', icon: '📋', description: 'Data tables and lists' },
  { value: 'gauge', label: 'Gauge', icon: '🎯', description: 'Progress and status gauges' },
  { value: 'alert', label: 'Alert', icon: '🚨', description: 'Risk and system alerts' },
  { value: 'news', label: 'News', icon: '📰', description: 'Market news and updates' },
  { value: 'order', label: 'Order', icon: '💼', description: 'Order entry and management' },
  { value: 'position', label: 'Position', icon: '📊', description: 'Position monitoring' }
]

const dataSources = [
  'portfolio_summary', 'positions', 'trades', 'orders', 'market_data',
  'performance_metrics', 'risk_metrics', 'agent_status', 'strategies',
  'alerts', 'news_feed', 'economic_calendar', 'earnings_calendar'
]

const generateMockLayouts = (): DashboardLayout[] => [
  {
    id: '1',
    name: 'Trading Command Center',
    description: 'Comprehensive trading dashboard with all key metrics',
    widgets: [
      {
        id: 'w1',
        type: 'metric',
        title: 'Portfolio Value',
        dataSource: 'portfolio_summary',
        config: { metric: 'totalValue', format: 'currency' },
        position: { x: 0, y: 0, w: 3, h: 2 },
        style: { backgroundColor: '#f8fafc' },
        filters: {},
        refreshInterval: 5000,
        isVisible: true
      },
      {
        id: 'w2',
        type: 'chart',
        title: 'Performance Chart',
        dataSource: 'performance_metrics',
        config: { chartType: 'line', timeframe: '1d' },
        position: { x: 3, y: 0, w: 6, h: 4 },
        style: {},
        filters: {},
        refreshInterval: 10000,
        isVisible: true
      },
      {
        id: 'w3',
        type: 'table',
        title: 'Top Positions',
        dataSource: 'positions',
        config: { maxRows: 10, sortBy: 'marketValue' },
        position: { x: 9, y: 0, w: 3, h: 4 },
        style: {},
        filters: {},
        refreshInterval: 15000,
        isVisible: true
      },
      {
        id: 'w4',
        type: 'alert',
        title: 'Risk Alerts',
        dataSource: 'alerts',
        config: { severity: 'high' },
        position: { x: 0, y: 2, w: 3, h: 2 },
        style: { borderColor: '#ef4444' },
        filters: { type: 'risk' },
        refreshInterval: 5000,
        isVisible: true
      }
    ],
    theme: 'trading',
    layout: 'grid',
    isPublic: true,
    isTemplate: false,
    category: 'trading',
    tags: ['comprehensive', 'real-time', 'trading'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-10'),
    createdBy: 'system',
    usage: 156
  },
  {
    id: '2',
    name: 'Risk Management Hub',
    description: 'Focused on risk monitoring and analysis',
    widgets: [
      {
        id: 'w5',
        type: 'gauge',
        title: 'Portfolio Risk',
        dataSource: 'risk_metrics',
        config: { metric: 'riskScore', max: 100 },
        position: { x: 0, y: 0, w: 4, h: 3 },
        style: {},
        filters: {},
        refreshInterval: 30000,
        isVisible: true
      },
      {
        id: 'w6',
        type: 'chart',
        title: 'VaR History',
        dataSource: 'risk_metrics',
        config: { chartType: 'area', metric: 'var95' },
        position: { x: 4, y: 0, w: 8, h: 3 },
        style: {},
        filters: {},
        refreshInterval: 60000,
        isVisible: true
      }
    ],
    theme: 'dark',
    layout: 'grid',
    isPublic: false,
    isTemplate: false,
    category: 'risk',
    tags: ['risk', 'monitoring', 'analysis'],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-02-01'),
    createdBy: 'user_123',
    usage: 45
  },
  {
    id: '3',
    name: 'Agent Performance Monitor',
    description: 'Track AI agent performance and decisions',
    widgets: [
      {
        id: 'w7',
        type: 'table',
        title: 'Agent Status',
        dataSource: 'agent_status',
        config: { showPerformance: true },
        position: { x: 0, y: 0, w: 6, h: 4 },
        style: {},
        filters: { status: 'active' },
        refreshInterval: 10000,
        isVisible: true
      },
      {
        id: 'w8',
        type: 'chart',
        title: 'Agent Returns',
        dataSource: 'agent_status',
        config: { chartType: 'bar', metric: 'returns' },
        position: { x: 6, y: 0, w: 6, h: 4 },
        style: {},
        filters: {},
        refreshInterval: 30000,
        isVisible: true
      }
    ],
    theme: 'light',
    layout: 'grid',
    isPublic: true,
    isTemplate: true,
    category: 'analytics',
    tags: ['agents', 'ai', 'performance'],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-05'),
    createdBy: 'system',
    usage: 78
  }
]

export function CustomDashboard() {
  const { performance } = usePerformanceMonitor('CustomDashboard')
  const wsClient = useTradingWebSocket()
  const [layouts, setLayouts] = useState<DashboardLayout[]>(generateMockLayouts())
  const [activeLayout, setActiveLayout] = useState<DashboardLayout | null>(layouts[0])
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null)
  const [newWidget, setNewWidget] = useState<Partial<DashboardWidget>>({
    type: 'metric',
    title: '',
    dataSource: 'portfolio_summary',
    config: {},
    position: { x: 0, y: 0, w: 3, h: 2 },
    style: {},
    filters: {},
    refreshInterval: 10000,
    isVisible: true
  })

  useEffect(() => {
    // Subscribe to dashboard updates
    const handleDashboardUpdate = (data: any) => {
      if (data.type === 'widget_data') {
        // Update widget data in real-time
        console.log('Widget data update:', data)
      }
    }

    wsClient?.on('dashboard_updates', handleDashboardUpdate)
    return () => {
      wsClient?.off('dashboard_updates', handleDashboardUpdate)
    }
  }, [wsClient])

  const createLayout = () => {
    const newLayout: DashboardLayout = {
      id: `layout-${Date.now()}`,
      name: 'New Dashboard',
      description: 'Custom dashboard layout',
      widgets: [],
      theme: 'light',
      layout: 'grid',
      isPublic: false,
      isTemplate: false,
      category: 'custom',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user',
      usage: 0
    }
    
    setLayouts([...layouts, newLayout])
    setActiveLayout(newLayout)
    setIsEditing(true)
    setIsCreating(false)
  }

  const addWidget = () => {
    if (!activeLayout) return

    const widget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      ...newWidget as DashboardWidget
    }

    const updatedLayout = {
      ...activeLayout,
      widgets: [...activeLayout.widgets, widget],
      updatedAt: new Date()
    }

    setLayouts(layouts.map(l => l.id === activeLayout.id ? updatedLayout : l))
    setActiveLayout(updatedLayout)
    setNewWidget({
      type: 'metric',
      title: '',
      dataSource: 'portfolio_summary',
      config: {},
      position: { x: 0, y: 0, w: 3, h: 2 },
      style: {},
      filters: {},
      refreshInterval: 10000,
      isVisible: true
    })
  }

  const removeWidget = (widgetId: string) => {
    if (!activeLayout) return

    const updatedLayout = {
      ...activeLayout,
      widgets: activeLayout.widgets.filter(w => w.id !== widgetId),
      updatedAt: new Date()
    }

    setLayouts(layouts.map(l => l.id === activeLayout.id ? updatedLayout : l))
    setActiveLayout(updatedLayout)
  }

  const duplicateLayout = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId)
    if (!layout) return

    const duplicated: DashboardLayout = {
      ...layout,
      id: `layout-${Date.now()}`,
      name: `${layout.name} (Copy)`,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: 0,
      widgets: layout.widgets.map(w => ({
        ...w,
        id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }))
    }

    setLayouts([...layouts, duplicated])
  }

  const renderWidget = (widget: DashboardWidget) => {
    const { type, title, config } = widget
    
    return (
      <Card key={widget.id} className="relative group">
        {isEditing && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedWidget(widget)}
              >
                <CogIcon className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeWidget(widget.id)}
              >
                <TrashIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {type === 'metric' && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {config.format === 'currency' ? '$1,234,567' : '85.7%'}
              </div>
              <div className="text-xs text-muted-foreground">
                {config.metric || 'Sample Metric'}
              </div>
            </div>
          )}
          
          {type === 'chart' && (
            <div className="h-32 bg-gradient-to-r from-blue-50 to-green-50 rounded flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                {config.chartType || 'Line'} Chart Placeholder
              </span>
            </div>
          )}
          
          {type === 'table' && (
            <div className="space-y-1">
              {Array.from({ length: config.maxRows || 5 }, (_, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>Item {i + 1}</span>
                  <span className="font-mono">${(Math.random() * 10000).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          
          {type === 'gauge' && (
            <div className="flex items-center justify-center h-24">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-blue-100 rounded-full"></div>
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">75%</span>
                </div>
              </div>
            </div>
          )}
          
          {type === 'alert' && (
            <div className="space-y-2">
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                <div className="font-medium text-red-800">High Risk Alert</div>
                <div className="text-red-600">Portfolio volatility exceeded threshold</div>
              </div>
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <div className="font-medium text-yellow-800">Medium Alert</div>
                <div className="text-yellow-600">Position concentration warning</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Squares2X2Icon className="h-6 w-6" />
              Custom Dashboard Builder
            </CardTitle>
            <CardDescription>
              Create and customize personalized trading dashboards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="builder" className="space-y-4">
              <TabsList>
                <TabsTrigger value="builder">Dashboard Builder</TabsTrigger>
                <TabsTrigger value="gallery">Dashboard Gallery</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="builder" className="space-y-4">
                {/* Dashboard Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Select
                      value={activeLayout?.id}
                      onValueChange={(layoutId) => {
                        const layout = layouts.find(l => l.id === layoutId)
                        setActiveLayout(layout || null)
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select dashboard" />
                      </SelectTrigger>
                      <SelectContent>
                        {layouts.map(layout => (
                          <SelectItem key={layout.id} value={layout.id}>
                            {layout.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {activeLayout && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{activeLayout.category}</Badge>
                        <Badge variant="outline">{activeLayout.widgets.length} widgets</Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsCreating(true)}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      New Dashboard
                    </Button>
                    <Button
                      variant={isEditing ? "default" : "outline"}
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? 'Exit Edit' : 'Edit Mode'}
                    </Button>
                    {activeLayout && (
                      <Button variant="outline" onClick={() => duplicateLayout(activeLayout.id)}>
                        <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                        Duplicate
                      </Button>
                    )}
                  </div>
                </div>

                {/* Widget Addition Panel */}
                {isEditing && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Add Widget</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="widget-type">Widget Type</Label>
                          <Select
                            value={newWidget.type}
                            onValueChange={(type: any) => setNewWidget({ ...newWidget, type })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {widgetTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.icon} {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="widget-title">Title</Label>
                          <Input
                            id="widget-title"
                            value={newWidget.title}
                            onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                            placeholder="Widget title"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="data-source">Data Source</Label>
                          <Select
                            value={newWidget.dataSource}
                            onValueChange={(dataSource) => setNewWidget({ ...newWidget, dataSource })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {dataSources.map(source => (
                                <SelectItem key={source} value={source}>
                                  {source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-end">
                          <Button onClick={addWidget} disabled={!newWidget.title || !newWidget.type}>
                            Add Widget
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Dashboard Grid */}
                {activeLayout && (
                  <div className="min-h-[600px] border rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-4 auto-rows-fr">
                      {activeLayout.widgets.map(widget => (
                        <div
                          key={widget.id}
                          className={`col-span-${widget.position.w} row-span-${widget.position.h}`}
                          style={{
                            gridColumnStart: widget.position.x + 1,
                            gridRowStart: widget.position.y + 1
                          }}
                        >
                          {renderWidget(widget)}
                        </div>
                      ))}
                    </div>
                    
                    {activeLayout.widgets.length === 0 && (
                      <div className="flex items-center justify-center h-full text-center">
                        <div>
                          <Squares2X2Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold">Empty Dashboard</h3>
                          <p className="text-muted-foreground">Add widgets to start building your dashboard</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="gallery" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {layouts.map(layout => (
                    <Card key={layout.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{layout.name}</h3>
                            <p className="text-sm text-muted-foreground">{layout.description}</p>
                          </div>
                          <div className="flex gap-1">
                            <Badge variant="outline">{layout.category}</Badge>
                            {layout.isPublic && <ShareIcon className="h-4 w-4 text-muted-foreground" />}
                            {layout.isTemplate && <BookmarkIcon className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-1 mb-3 h-16 bg-gray-50 rounded p-2">
                          {layout.widgets.slice(0, 8).map((widget, idx) => (
                            <div
                              key={idx}
                              className="bg-white rounded border text-xs flex items-center justify-center"
                            >
                              {widgetTypes.find(t => t.value === widget.type)?.icon}
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <span>{layout.widgets.length} widgets</span>
                          <span>{layout.usage} uses</span>
                          <span>{layout.updatedAt.toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {layout.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setActiveLayout(layout)}
                            className="flex-1"
                          >
                            <EyeIcon className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => duplicateLayout(layout.id)}
                          >
                            <DocumentDuplicateIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="templates" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      name: 'Trading Desk',
                      description: 'Complete trading workstation with order entry, positions, and market data',
                      widgets: ['Portfolio Summary', 'Order Entry', 'Position Table', 'Market Watch', 'Trade History'],
                      category: 'trading'
                    },
                    {
                      name: 'Risk Monitor',
                      description: 'Risk management focused dashboard with VaR, stress tests, and alerts',
                      widgets: ['Risk Metrics', 'VaR Chart', 'Stress Test Results', 'Risk Alerts', 'Concentration'],
                      category: 'risk'
                    },
                    {
                      name: 'Portfolio Overview',
                      description: 'High-level portfolio view for investors and managers',
                      widgets: ['Portfolio Value', 'Allocation Chart', 'Performance', 'Top Holdings', 'News'],
                      category: 'portfolio'
                    },
                    {
                      name: 'AI Agent Monitor',
                      description: 'Monitor AI trading agents and their performance',
                      widgets: ['Agent Status', 'Agent Performance', 'Decision Log', 'Strategy Comparison'],
                      category: 'analytics'
                    }
                  ].map((template, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </div>
                          <Badge variant="outline">{template.category}</Badge>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <h4 className="font-medium">Included Widgets:</h4>
                          <div className="space-y-1">
                            {template.widgets.map(widget => (
                              <div key={widget} className="text-sm text-muted-foreground flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded"></div>
                                {widget}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <Button className="w-full">
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Create Dashboard Dialog */}
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Dashboard</DialogTitle>
              <DialogDescription>
                Set up a new custom dashboard layout
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dashboard-name">Dashboard Name</Label>
                <Input id="dashboard-name" placeholder="My Trading Dashboard" />
              </div>
              <div>
                <Label htmlFor="dashboard-desc">Description</Label>
                <Input id="dashboard-desc" placeholder="Describe your dashboard" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dashboard-category">Category</Label>
                  <Select defaultValue="custom">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trading">Trading</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="risk">Risk</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dashboard-theme">Theme</Label>
                  <Select defaultValue="light">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="trading">Trading</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={createLayout} className="flex-1">
                  Create Dashboard
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PremiumThemeProvider>
  )
}