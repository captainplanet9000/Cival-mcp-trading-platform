'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/stores/app-store'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { MentionableAgent } from './FancyArea'
import { cn } from '@/lib/utils'
import {
  Bot,
  Search,
  Filter,
  Users,
  MessageCircle,
  TrendingUp,
  Shield,
  BarChart3,
  Settings,
  Plus,
  Star,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  Activity
} from 'lucide-react'

export interface AgentPanelProps {
  agents?: MentionableAgent[]
  onAgentSelect?: (agent: MentionableAgent) => void
  onStartConversation?: (agentId: string) => void
  showAddAgent?: boolean
  className?: string
}

interface AgentActivity {
  id: string
  agentId: string
  type: 'trade_executed' | 'analysis_completed' | 'alert_triggered' | 'strategy_updated'
  message: string
  timestamp: Date
  metadata?: any
}

const AGENT_TYPE_CONFIG = {
  trading: {
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    label: 'Trading'
  },
  analysis: {
    icon: BarChart3,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
    label: 'Analysis'
  },
  risk: {
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    label: 'Risk Management'
  },
  strategy: {
    icon: Bot,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    label: 'Strategy'
  },
  general: {
    icon: MessageCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'General'
  }
}

export function AgentPanel({
  agents = [],
  onAgentSelect,
  onStartConversation,
  showAddAgent = true,
  className
}: AgentPanelProps) {
  const { mentionableAgents, updateMentionableAgents } = useAppStore()
  const { publishEvent, subscribeToEvent } = useAGUIProtocol()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([])
  const [selectedAgent, setSelectedAgent] = useState<MentionableAgent | null>(null)

  // Combine store agents with props agents
  const allAgents = [...agents, ...mentionableAgents]

  // Filter agents based on search and filters
  const filteredAgents = allAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.capabilities?.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesType = filterType === 'all' || agent.type === filterType
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  // Group agents by status
  const agentsByStatus = {
    online: filteredAgents.filter(a => a.status === 'online'),
    busy: filteredAgents.filter(a => a.status === 'busy'),
    offline: filteredAgents.filter(a => a.status === 'offline')
  }

  // Handle agent selection
  const handleAgentClick = (agent: MentionableAgent) => {
    setSelectedAgent(agent)
    onAgentSelect?.(agent)
    
    publishEvent('mention.agent_selected', {
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type
    })
  }

  // Start conversation with agent
  const handleStartConversation = (agent: MentionableAgent) => {
    onStartConversation?.(agent.id)
    
    publishEvent('mention.conversation_started', {
      agentId: agent.id,
      agentName: agent.name,
      timestamp: Date.now()
    })
  }

  // Subscribe to agent status updates
  useEffect(() => {
    const unsubscribes = [
      subscribeToEvent('agent.status_changed', (data) => {
        updateMentionableAgents(
          mentionableAgents.map(agent =>
            agent.id === data.agentId
              ? { ...agent, status: data.status }
              : agent
          )
        )
      }),
      
      subscribeToEvent('agent.activity', (data) => {
        setAgentActivities(prev => [
          {
            id: `activity_${Date.now()}`,
            agentId: data.agentId,
            type: data.type,
            message: data.message,
            timestamp: new Date(),
            metadata: data.metadata
          },
          ...prev.slice(0, 19) // Keep last 20 activities
        ])
      })
    ]
    
    return () => unsubscribes.forEach(unsub => unsub())
  }, [mentionableAgents, updateMentionableAgents, subscribeToEvent])

  // Create sample agents if none exist
  useEffect(() => {
    if (allAgents.length === 0 && mentionableAgents.length === 0) {
      const sampleAgents: MentionableAgent[] = [
        {
          id: 'trading-agent-1',
          name: 'AlphaTrader',
          type: 'trading',
          status: 'online',
          description: 'Advanced trading algorithm with momentum strategies',
          capabilities: ['momentum trading', 'risk assessment', 'order execution']
        },
        {
          id: 'analysis-agent-1',
          name: 'MarketMind',
          type: 'analysis',
          status: 'online',
          description: 'Deep market analysis and technical indicators',
          capabilities: ['technical analysis', 'pattern recognition', 'market forecasting']
        },
        {
          id: 'risk-agent-1',
          name: 'RiskGuardian',
          type: 'risk',
          status: 'busy',
          description: 'Portfolio risk management and stress testing',
          capabilities: ['VaR calculation', 'stress testing', 'exposure monitoring']
        },
        {
          id: 'strategy-agent-1',
          name: 'StrategyArchitect',
          type: 'strategy',
          status: 'online',
          description: 'Strategy development and backtesting specialist',
          capabilities: ['strategy design', 'backtesting', 'optimization']
        }
      ]
      
      updateMentionableAgents(sampleAgents)
    }
  }, [allAgents.length, mentionableAgents.length, updateMentionableAgents])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            AI Agents ({allAgents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-2 gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="trading">Trading</SelectItem>
                <SelectItem value="analysis">Analysis</SelectItem>
                <SelectItem value="risk">Risk Management</SelectItem>
                <SelectItem value="strategy">Strategy</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agent List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Available Agents
            {showAddAgent && (
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {Object.entries(agentsByStatus).map(([status, agents]) => (
                agents.length > 0 && (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        status === 'online' ? 'bg-green-500' :
                        status === 'busy' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      )} />
                      <span className="text-sm font-medium capitalize">{status}</span>
                      <Badge variant="outline" className="text-xs">
                        {agents.length}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 ml-4">
                      {agents.map((agent) => {
                        const config = AGENT_TYPE_CONFIG[agent.type]
                        const IconComponent = config.icon
                        
                        return (
                          <div
                            key={agent.id}
                            className={cn(
                              "p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                              selectedAgent?.id === agent.id && "ring-2 ring-primary"
                            )}
                            onClick={() => handleAgentClick(agent)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                config.bgColor
                              )}>
                                <IconComponent className={cn("h-5 w-5", config.color)} />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium truncate">{agent.name}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {config.label}
                                  </Badge>
                                </div>
                                
                                {agent.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {agent.description}
                                  </p>
                                )}
                                
                                {agent.capabilities && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {agent.capabilities.slice(0, 3).map((capability) => (
                                      <Badge key={capability} variant="outline" className="text-xs">
                                        {capability}
                                      </Badge>
                                    ))}
                                    {agent.capabilities.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{agent.capabilities.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between mt-3">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Activity className="h-3 w-3" />
                                    <span>Active</span>
                                  </div>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStartConversation(agent)
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4 mr-1" />
                                    Chat
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              ))}
              
              {filteredAgents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No agents found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {agentActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {agentActivities.slice(0, 10).map((activity) => {
                  const agent = allAgents.find(a => a.id === activity.agentId)
                  const config = agent ? AGENT_TYPE_CONFIG[agent.type] : AGENT_TYPE_CONFIG.general
                  const IconComponent = config.icon
                  
                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center mt-0.5",
                        config.bgColor
                      )}>
                        <IconComponent className={cn("h-3 w-3", config.color)} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{agent?.name || 'Unknown Agent'}</span>
                          {' '}
                          {activity.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}