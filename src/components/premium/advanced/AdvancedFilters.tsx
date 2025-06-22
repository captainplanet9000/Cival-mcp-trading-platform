'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { PremiumThemeProvider } from '@/components/premium/theme/premium-theme'
import { useTradingWebSocket } from '@/hooks/use-trading-websocket'
import { usePerformanceMonitor } from '@/lib/performance/optimization'
import { 
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  TagIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  XMarkIcon,
  BookmarkIcon,
  ShareIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FlagIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface FilterCondition {
  id: string
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in' | 'not_in'
  value: any
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array'
  label: string
}

interface FilterGroup {
  id: string
  name: string
  logic: 'AND' | 'OR'
  conditions: FilterCondition[]
  color: string
}

interface SavedFilter {
  id: string
  name: string
  description: string
  groups: FilterGroup[]
  category: 'trading' | 'portfolio' | 'risk' | 'performance' | 'custom'
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
  usage: number
  tags: string[]
}

interface FilterField {
  key: string
  label: string
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array'
  category: 'basic' | 'technical' | 'fundamental' | 'risk' | 'performance'
  options?: string[]
  min?: number
  max?: number
}

const filterFields: FilterField[] = [
  // Basic Fields
  { key: 'symbol', label: 'Symbol', dataType: 'string', category: 'basic' },
  { key: 'price', label: 'Current Price', dataType: 'number', category: 'basic', min: 0 },
  { key: 'volume', label: 'Volume', dataType: 'number', category: 'basic', min: 0 },
  { key: 'marketCap', label: 'Market Cap', dataType: 'number', category: 'basic', min: 0 },
  { key: 'sector', label: 'Sector', dataType: 'string', category: 'basic', 
    options: ['Technology', 'Healthcare', 'Financial', 'Energy', 'Consumer', 'Industrial', 'Utilities', 'Materials'] },
  
  // Technical Indicators
  { key: 'rsi', label: 'RSI', dataType: 'number', category: 'technical', min: 0, max: 100 },
  { key: 'macd', label: 'MACD', dataType: 'number', category: 'technical' },
  { key: 'sma20', label: 'SMA 20', dataType: 'number', category: 'technical', min: 0 },
  { key: 'sma50', label: 'SMA 50', dataType: 'number', category: 'technical', min: 0 },
  { key: 'bollinger_upper', label: 'Bollinger Upper', dataType: 'number', category: 'technical' },
  { key: 'bollinger_lower', label: 'Bollinger Lower', dataType: 'number', category: 'technical' },
  
  // Fundamental Data
  { key: 'pe_ratio', label: 'P/E Ratio', dataType: 'number', category: 'fundamental', min: 0 },
  { key: 'pb_ratio', label: 'P/B Ratio', dataType: 'number', category: 'fundamental', min: 0 },
  { key: 'debt_to_equity', label: 'Debt to Equity', dataType: 'number', category: 'fundamental', min: 0 },
  { key: 'dividend_yield', label: 'Dividend Yield', dataType: 'number', category: 'fundamental', min: 0, max: 20 },
  { key: 'revenue_growth', label: 'Revenue Growth', dataType: 'number', category: 'fundamental' },
  
  // Risk Metrics
  { key: 'beta', label: 'Beta', dataType: 'number', category: 'risk' },
  { key: 'volatility', label: 'Volatility', dataType: 'number', category: 'risk', min: 0 },
  { key: 'var_95', label: 'VaR 95%', dataType: 'number', category: 'risk' },
  { key: 'sharpe_ratio', label: 'Sharpe Ratio', dataType: 'number', category: 'risk' },
  
  // Performance Metrics
  { key: 'return_1d', label: '1D Return', dataType: 'number', category: 'performance' },
  { key: 'return_1w', label: '1W Return', dataType: 'number', category: 'performance' },
  { key: 'return_1m', label: '1M Return', dataType: 'number', category: 'performance' },
  { key: 'return_ytd', label: 'YTD Return', dataType: 'number', category: 'performance' },
  { key: 'max_drawdown', label: 'Max Drawdown', dataType: 'number', category: 'performance' }
]

const operators = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'in', label: 'In List' },
    { value: 'not_in', label: 'Not In List' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'between', label: 'Between' }
  ],
  date: [
    { value: 'equals', label: 'On' },
    { value: 'greater_than', label: 'After' },
    { value: 'less_than', label: 'Before' },
    { value: 'between', label: 'Between' }
  ],
  boolean: [
    { value: 'equals', label: 'Is' }
  ],
  array: [
    { value: 'contains', label: 'Contains' },
    { value: 'in', label: 'In' },
    { value: 'not_in', label: 'Not In' }
  ]
}

const generateMockSavedFilters = (): SavedFilter[] => [
  {
    id: '1',
    name: 'High Growth Tech Stocks',
    description: 'Technology stocks with high revenue growth and low P/E ratios',
    groups: [{
      id: 'g1',
      name: 'Growth Criteria',
      logic: 'AND',
      conditions: [
        { id: 'c1', field: 'sector', operator: 'equals', value: 'Technology', dataType: 'string', label: 'Technology Sector' },
        { id: 'c2', field: 'revenue_growth', operator: 'greater_than', value: 20, dataType: 'number', label: 'Revenue Growth > 20%' },
        { id: 'c3', field: 'pe_ratio', operator: 'less_than', value: 25, dataType: 'number', label: 'P/E < 25' }
      ],
      color: 'blue'
    }],
    category: 'trading',
    isPublic: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-01'),
    usage: 45,
    tags: ['growth', 'technology', 'value']
  },
  {
    id: '2',
    name: 'Oversold RSI Opportunities',
    description: 'Stocks with RSI below 30 and positive momentum',
    groups: [{
      id: 'g2',
      name: 'Technical Setup',
      logic: 'AND',
      conditions: [
        { id: 'c4', field: 'rsi', operator: 'less_than', value: 30, dataType: 'number', label: 'RSI < 30' },
        { id: 'c5', field: 'volume', operator: 'greater_than', value: 1000000, dataType: 'number', label: 'Volume > 1M' },
        { id: 'c6', field: 'return_1w', operator: 'greater_than', value: -10, dataType: 'number', label: '1W Return > -10%' }
      ],
      color: 'green'
    }],
    category: 'trading',
    isPublic: false,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-15'),
    usage: 23,
    tags: ['technical', 'oversold', 'momentum']
  },
  {
    id: '3',
    name: 'Low Risk Dividend Stocks',
    description: 'Stable dividend-paying stocks with low volatility',
    groups: [{
      id: 'g3',
      name: 'Risk Profile',
      logic: 'AND',
      conditions: [
        { id: 'c7', field: 'dividend_yield', operator: 'greater_than', value: 3, dataType: 'number', label: 'Dividend Yield > 3%' },
        { id: 'c8', field: 'beta', operator: 'less_than', value: 1, dataType: 'number', label: 'Beta < 1' },
        { id: 'c9', field: 'volatility', operator: 'less_than', value: 20, dataType: 'number', label: 'Volatility < 20%' }
      ],
      color: 'purple'
    }],
    category: 'portfolio',
    isPublic: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-25'),
    usage: 67,
    tags: ['dividend', 'low-risk', 'income']
  }
]

export function AdvancedFilters() {
  const { performance } = usePerformanceMonitor('AdvancedFilters')
  const wsClient = useTradingWebSocket()
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(generateMockSavedFilters())
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'basic' | 'technical' | 'fundamental' | 'risk' | 'performance'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isBuilding, setIsBuilding] = useState(false)
  const [selectedSavedFilter, setSelectedSavedFilter] = useState<string | null>(null)

  useEffect(() => {
    // Initialize with empty filter group
    setFilterGroups([{
      id: 'default',
      name: 'Default Group',
      logic: 'AND',
      conditions: [],
      color: 'blue'
    }])
  }, [])

  const addFilterGroup = () => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      name: `Group ${filterGroups.length + 1}`,
      logic: 'AND',
      conditions: [],
      color: ['blue', 'green', 'purple', 'orange', 'red'][filterGroups.length % 5]
    }
    setFilterGroups([...filterGroups, newGroup])
  }

  const addCondition = (groupId: string) => {
    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      dataType: 'string',
      label: 'New Condition'
    }
    
    setFilterGroups(groups =>
      groups.map(group =>
        group.id === groupId
          ? { ...group, conditions: [...group.conditions, newCondition] }
          : group
      )
    )
  }

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    setFilterGroups(groups =>
      groups.map(group =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.map(condition =>
                condition.id === conditionId ? { ...condition, ...updates } : condition
              )
            }
          : group
      )
    )
  }

  const removeCondition = (groupId: string, conditionId: string) => {
    setFilterGroups(groups =>
      groups.map(group =>
        group.id === groupId
          ? { ...group, conditions: group.conditions.filter(c => c.id !== conditionId) }
          : group
      )
    )
  }

  const removeGroup = (groupId: string) => {
    setFilterGroups(groups => groups.filter(g => g.id !== groupId))
  }

  const applyFilter = () => {
    const filterData = {
      groups: filterGroups,
      timestamp: new Date()
    }
    
    console.log('Applying filter:', filterData)
    wsClient?.emit('apply_filter', filterData)
  }

  const saveFilter = () => {
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name: `Custom Filter ${savedFilters.length + 1}`,
      description: 'Custom filter configuration',
      groups: filterGroups,
      category: 'custom',
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: 0,
      tags: []
    }
    
    setSavedFilters([...savedFilters, newFilter])
  }

  const loadSavedFilter = (filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId)
    if (filter) {
      setFilterGroups(filter.groups)
      setSelectedSavedFilter(filterId)
    }
  }

  const getFilteredFields = () => {
    if (selectedCategory === 'all') return filterFields
    return filterFields.filter(field => field.category === selectedCategory)
  }

  const renderConditionValue = (condition: FilterCondition, groupId: string) => {
    const field = filterFields.find(f => f.key === condition.field)
    
    if (!field) return null

    switch (field.dataType) {
      case 'string':
        if (field.options) {
          return (
            <Select
              value={condition.value}
              onValueChange={(value) => updateCondition(groupId, condition.id, { value })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {field.options.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        return (
          <Input
            value={condition.value}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            placeholder="Enter value"
            className="w-[200px]"
          />
        )
      
      case 'number':
        if (condition.operator === 'between') {
          return (
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={condition.value?.[0] || ''}
                onChange={(e) => updateCondition(groupId, condition.id, { 
                  value: [parseFloat(e.target.value), condition.value?.[1] || 0] 
                })}
                placeholder="Min"
                className="w-[90px]"
              />
              <span>to</span>
              <Input
                type="number"
                value={condition.value?.[1] || ''}
                onChange={(e) => updateCondition(groupId, condition.id, { 
                  value: [condition.value?.[0] || 0, parseFloat(e.target.value)] 
                })}
                placeholder="Max"
                className="w-[90px]"
              />
            </div>
          )
        }
        return (
          <Input
            type="number"
            value={condition.value}
            onChange={(e) => updateCondition(groupId, condition.id, { value: parseFloat(e.target.value) })}
            placeholder="Enter value"
            className="w-[200px]"
            min={field.min}
            max={field.max}
          />
        )
      
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {condition.value ? format(new Date(condition.value), 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={condition.value ? new Date(condition.value) : undefined}
                onSelect={(date) => updateCondition(groupId, condition.id, { value: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )
      
      case 'boolean':
        return (
          <Select
            value={condition.value?.toString()}
            onValueChange={(value) => updateCondition(groupId, condition.id, { value: value === 'true' })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        )
      
      default:
        return null
    }
  }

  return (
    <PremiumThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FunnelIcon className="h-6 w-6" />
              Advanced Filters
            </CardTitle>
            <CardDescription>
              Build complex filters with multiple conditions and logic groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="builder" className="space-y-4">
              <TabsList>
                <TabsTrigger value="builder">Filter Builder</TabsTrigger>
                <TabsTrigger value="saved">
                  Saved Filters
                  <Badge className="ml-2">{savedFilters.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="builder" className="space-y-6">
                {/* Field Category Filter */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium">Field Categories:</span>
                  {['all', 'basic', 'technical', 'fundamental', 'risk', 'performance'].map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category as any)}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Button>
                  ))}
                </div>

                {/* Filter Groups */}
                <div className="space-y-4">
                  {filterGroups.map((group, groupIndex) => (
                    <Card key={group.id} className="border-l-4" style={{ borderLeftColor: `var(--${group.color}-500)` }}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Input
                              value={group.name}
                              onChange={(e) => {
                                setFilterGroups(groups =>
                                  groups.map(g => g.id === group.id ? { ...g, name: e.target.value } : g)
                                )
                              }}
                              className="w-40"
                            />
                            <Select
                              value={group.logic}
                              onValueChange={(logic: 'AND' | 'OR') => {
                                setFilterGroups(groups =>
                                  groups.map(g => g.id === group.id ? { ...g, logic } : g)
                                )
                              }}
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addCondition(group.id)}
                            >
                              Add Condition
                            </Button>
                            {filterGroups.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeGroup(group.id)}
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {group.conditions.map((condition, conditionIndex) => {
                            const field = filterFields.find(f => f.key === condition.field)
                            
                            return (
                              <div key={condition.id} className="flex items-center gap-2 p-2 border rounded">
                                {conditionIndex > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {group.logic}
                                  </Badge>
                                )}
                                
                                <Select
                                  value={condition.field}
                                  onValueChange={(field) => {
                                    const fieldDef = filterFields.find(f => f.key === field)
                                    updateCondition(group.id, condition.id, {
                                      field,
                                      dataType: fieldDef?.dataType || 'string',
                                      operator: 'equals',
                                      value: '',
                                      label: fieldDef?.label || field
                                    })
                                  }}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select field" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getFilteredFields().map(field => (
                                      <SelectItem key={field.key} value={field.key}>
                                        {field.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Select
                                  value={condition.operator}
                                  onValueChange={(operator: any) => updateCondition(group.id, condition.id, { operator })}
                                  disabled={!condition.field}
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Operator" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {field && operators[field.dataType]?.map(op => (
                                      <SelectItem key={op.value} value={op.value}>
                                        {op.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {renderConditionValue(condition, group.id)}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeCondition(group.id, condition.id)}
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            )
                          })}
                          
                          {group.conditions.length === 0 && (
                            <div className="text-center py-4 text-muted-foreground">
                              No conditions added. Click "Add Condition" to start building your filter.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={addFilterGroup} variant="outline">
                    Add Group
                  </Button>
                  <Button onClick={applyFilter} disabled={filterGroups.every(g => g.conditions.length === 0)}>
                    Apply Filter
                  </Button>
                  <Button onClick={saveFilter} variant="outline" disabled={filterGroups.every(g => g.conditions.length === 0)}>
                    <BookmarkIcon className="h-4 w-4 mr-2" />
                    Save Filter
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setFilterGroups([{
                        id: 'default',
                        name: 'Default Group',
                        logic: 'AND',
                        conditions: [],
                        color: 'blue'
                      }])
                    }}
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="saved" className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search saved filters..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="trading">Trading</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="risk">Risk</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {savedFilters
                      .filter(filter => 
                        filter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        filter.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        filter.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map(filter => (
                        <Card key={filter.id} className={selectedSavedFilter === filter.id ? 'ring-2 ring-blue-500' : ''}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold">{filter.name}</h3>
                                  <Badge variant="outline">{filter.category}</Badge>
                                  {filter.isPublic && (
                                    <Badge variant="secondary">
                                      <ShareIcon className="h-3 w-3 mr-1" />
                                      Public
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{filter.description}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>Used {filter.usage} times</span>
                                  <span>•</span>
                                  <span>Updated {filter.updatedAt.toLocaleDateString()}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {filter.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      <TagIcon className="h-2 w-2 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => loadSavedFilter(filter.id)}
                                >
                                  Load
                                </Button>
                                <Badge variant="outline" className="text-xs">
                                  {filter.groups.length} group{filter.groups.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="templates" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      name: 'Momentum Breakout',
                      description: 'Stocks breaking out with high volume and momentum',
                      conditions: ['Price > SMA 20', 'Volume > 2x Average', 'RSI > 50']
                    },
                    {
                      name: 'Value Screening',
                      description: 'Undervalued stocks with strong fundamentals',
                      conditions: ['P/E < 15', 'P/B < 2', 'Debt/Equity < 0.5']
                    },
                    {
                      name: 'High Dividend Yield',
                      description: 'Stable dividend-paying stocks',
                      conditions: ['Dividend Yield > 4%', 'Beta < 1.2', 'Market Cap > $1B']
                    },
                    {
                      name: 'Growth Stocks',
                      description: 'High growth potential stocks',
                      conditions: ['Revenue Growth > 25%', 'EPS Growth > 20%', 'ROE > 15%']
                    }
                  ].map((template, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2">{template.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                        <div className="space-y-1">
                          {template.conditions.map((condition, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                              <FlagIcon className="h-3 w-3" />
                              {condition}
                            </div>
                          ))}
                        </div>
                        <Button size="sm" className="w-full mt-3" variant="outline">
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
      </div>
    </PremiumThemeProvider>
  )
}