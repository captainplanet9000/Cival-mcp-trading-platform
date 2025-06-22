'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradingWebSocketClient } from '@/lib/websocket/websocket-client';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface Agent {
  id: string;
  name: string;
  type: 'momentum' | 'mean_reversion' | 'arbitrage' | 'market_making' | 'sentiment' | 'technical' | 'fundamental';
  status: 'active' | 'paused' | 'stopped' | 'error' | 'initializing';
  health: 'excellent' | 'good' | 'warning' | 'critical';
  
  // Performance metrics
  totalReturn: number;
  dailyReturn: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  
  // Current state
  allocatedCapital: number;
  currentValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  positionsCount: number;
  ordersCount: number;
  
  // Activity metrics
  totalTrades: number;
  tradesThisWeek: number;
  avgTradeSize: number;
  lastTradeTime?: Date;
  uptime: number; // percentage
  
  // Risk metrics
  riskLevel: 'low' | 'medium' | 'high';
  utilization: number; // percentage of allocated capital used
  maxLossLimit: number;
  currentLoss: number;
  
  // Configuration
  symbols: string[];
  strategies: string[];
  riskParameters: {
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
    maxDailyLoss: number;
  };
  
  // Monitoring
  lastHeartbeat: Date;
  errorCount: number;
  warningCount: number;
  decisionsThisHour: number;
}

interface AgentDashboardProps {
  agents: Agent[];
  wsClient?: TradingWebSocketClient;
  enableRealTimeUpdates?: boolean;
  onAgentAction?: (agentId: string, action: 'start' | 'pause' | 'stop' | 'restart' | 'configure') => Promise<void>;
  onViewDetails?: (agent: Agent) => void;
  className?: string;
}

const AGENT_TYPE_COLORS = {
  momentum: 'bg-blue-100 text-blue-800',
  mean_reversion: 'bg-purple-100 text-purple-800',
  arbitrage: 'bg-green-100 text-green-800',
  market_making: 'bg-orange-100 text-orange-800',
  sentiment: 'bg-pink-100 text-pink-800',
  technical: 'bg-indigo-100 text-indigo-800',
  fundamental: 'bg-teal-100 text-teal-800',
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  stopped: 'bg-gray-100 text-gray-800',
  error: 'bg-red-100 text-red-800',
  initializing: 'bg-blue-100 text-blue-800',
};

const HEALTH_COLORS = {
  excellent: 'bg-green-500',
  good: 'bg-blue-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
};

export function AgentDashboard({
  agents,
  wsClient,
  enableRealTimeUpdates = true,
  onAgentAction,
  onViewDetails,
  className,
}: AgentDashboardProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'AgentDashboard',
  });

  const [filteredAgents, setFilteredAgents] = useState(agents);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('performance');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!enableRealTimeUpdates || !wsClient) return;

    const unsubscribe = wsClient.on('agent_update', (message) => {
      const updatedAgent = message.data as Partial<Agent> & { id: string };
      
      setFilteredAgents(prevAgents => 
        prevAgents.map(agent => 
          agent.id === updatedAgent.id 
            ? { ...agent, ...updatedAgent, lastHeartbeat: new Date() }
            : agent
        )
      );
    });

    // Subscribe to agent updates
    wsClient.send('subscribe_agents', { agentIds: agents.map(a => a.id) });

    return () => {
      unsubscribe();
      wsClient.send('unsubscribe_agents', { agentIds: agents.map(a => a.id) });
    };
  }, [wsClient, enableRealTimeUpdates, agents]);

  // Performance monitoring
  useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Filter and sort agents
  useEffect(() => {
    let filtered = [...agents];

    // Apply filters
    if (filterStatus !== 'all') {
      filtered = filtered.filter(agent => agent.status === filterStatus);
    }
    if (filterType !== 'all') {
      filtered = filtered.filter(agent => agent.type === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return b.totalReturn - a.totalReturn;
        case 'daily_return':
          return b.dailyReturn - a.dailyReturn;
        case 'sharpe_ratio':
          return b.sharpeRatio - a.sharpeRatio;
        case 'profit_factor':
          return b.profitFactor - a.profitFactor;
        case 'trades':
          return b.totalTrades - a.totalTrades;
        case 'uptime':
          return b.uptime - a.uptime;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredAgents(filtered);
  }, [agents, filterStatus, filterType, sortBy]);

  // Calculate portfolio statistics
  const portfolioStats = useMemo(() => {
    const activeAgents = filteredAgents.filter(agent => agent.status === 'active');
    const totalCapital = filteredAgents.reduce((sum, agent) => sum + agent.allocatedCapital, 0);
    const totalValue = filteredAgents.reduce((sum, agent) => sum + agent.currentValue, 0);
    const totalPnL = filteredAgents.reduce((sum, agent) => sum + agent.unrealizedPnL + agent.realizedPnL, 0);
    const totalTrades = filteredAgents.reduce((sum, agent) => sum + agent.totalTrades, 0);
    const avgReturn = filteredAgents.length > 0 
      ? filteredAgents.reduce((sum, agent) => sum + agent.totalReturn, 0) / filteredAgents.length 
      : 0;

    return {
      totalAgents: filteredAgents.length,
      activeAgents: activeAgents.length,
      totalCapital,
      totalValue,
      totalPnL,
      totalTrades,
      avgReturn,
      utilization: totalCapital > 0 ? (totalValue / totalCapital) * 100 : 0,
    };
  }, [filteredAgents]);

  // Handle agent actions
  const handleAgentAction = async (agentId: string, action: 'start' | 'pause' | 'stop' | 'restart' | 'configure') => {
    if (onAgentAction) {
      await onAgentAction(agentId, action);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: 'start' | 'pause' | 'stop') => {
    for (const agentId of selectedAgents) {
      await handleAgentAction(agentId, action);
    }
    setSelectedAgents([]);
  };

  // Render agent card
  const renderAgentCard = (agent: Agent) => (
    <Card key={agent.id} className="relative group hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{agent.name}</h3>
              <div
                className={cn('w-2 h-2 rounded-full', HEALTH_COLORS[agent.health])}
                title={`Health: ${agent.health}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-xs', AGENT_TYPE_COLORS[agent.type])}>
                {agent.type.replace('_', ' ')}
              </Badge>
              <Badge className={cn('text-xs', STATUS_COLORS[agent.status])}>
                {agent.status}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 3a1 1 0 100-2 1 1 0 000 2zM6 7a1 1 0 100-2 1 1 0 000 2zM6 11a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails?.(agent)}>
                View Details
              </DropdownMenuItem>
              {agent.status === 'active' ? (
                <DropdownMenuItem onClick={() => handleAgentAction(agent.id, 'pause')}>
                  Pause Agent
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleAgentAction(agent.id, 'start')}>
                  Start Agent
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleAgentAction(agent.id, 'restart')}>
                Restart Agent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAgentAction(agent.id, 'configure')}>
                Configure
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleAgentAction(agent.id, 'stop')}
                className="text-destructive"
              >
                Stop Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={cn(
              'text-lg font-bold',
              agent.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {agent.totalReturn >= 0 ? '+' : ''}{(agent.totalReturn * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Total Return</div>
          </div>
          <div className="text-center">
            <div className={cn(
              'text-lg font-bold',
              agent.dailyReturn >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {agent.dailyReturn >= 0 ? '+' : ''}{(agent.dailyReturn * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">Daily Return</div>
          </div>
        </div>

        {/* Capital Allocation */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Capital Utilization</span>
            <span className="font-mono">{agent.utilization.toFixed(1)}%</span>
          </div>
          <Progress value={agent.utilization} className="h-2" />
          <div className="flex items-center justify-between text-xs mt-1">
            <span>${agent.allocatedCapital.toLocaleString()}</span>
            <span>${agent.currentValue.toLocaleString()}</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-muted-foreground">Win Rate</div>
            <div className="font-medium">{(agent.winRate * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Sharpe Ratio</div>
            <div className="font-medium">{agent.sharpeRatio.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total Trades</div>
            <div className="font-medium">{agent.totalTrades}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Uptime</div>
            <div className="font-medium">{agent.uptime.toFixed(1)}%</div>
          </div>
        </div>

        {/* Risk Indicator */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Risk Level</span>
          <Badge 
            className={cn(
              agent.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
              agent.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            )}
          >
            {agent.riskLevel}
          </Badge>
        </div>

        {/* Active Symbols */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Active Symbols</div>
          <div className="flex flex-wrap gap-1">
            {agent.symbols.slice(0, 3).map(symbol => (
              <Badge key={symbol} variant="outline" className="text-xs">
                {symbol}
              </Badge>
            ))}
            {agent.symbols.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{agent.symbols.length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Last Activity */}
        <div className="text-xs text-muted-foreground">
          Last heartbeat: {agent.lastHeartbeat.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );

  // Render agent row (list view)
  const renderAgentRow = (agent: Agent) => (
    <tr key={agent.id} className="border-b hover:bg-muted/20">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedAgents.includes(agent.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedAgents([...selectedAgents, agent.id]);
              } else {
                setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
              }
            }}
          />
          <div
            className={cn('w-2 h-2 rounded-full', HEALTH_COLORS[agent.health])}
          />
          <span className="font-medium">{agent.name}</span>
        </div>
      </td>
      <td className="p-3">
        <Badge className={cn('text-xs', AGENT_TYPE_COLORS[agent.type])}>
          {agent.type.replace('_', ' ')}
        </Badge>
      </td>
      <td className="p-3">
        <Badge className={cn('text-xs', STATUS_COLORS[agent.status])}>
          {agent.status}
        </Badge>
      </td>
      <td className={cn(
        'p-3 text-right font-mono',
        agent.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
      )}>
        {agent.totalReturn >= 0 ? '+' : ''}{(agent.totalReturn * 100).toFixed(1)}%
      </td>
      <td className={cn(
        'p-3 text-right font-mono',
        agent.dailyReturn >= 0 ? 'text-green-600' : 'text-red-600'
      )}>
        {agent.dailyReturn >= 0 ? '+' : ''}{(agent.dailyReturn * 100).toFixed(2)}%
      </td>
      <td className="p-3 text-right font-mono">{agent.sharpeRatio.toFixed(2)}</td>
      <td className="p-3 text-right font-mono">{(agent.winRate * 100).toFixed(1)}%</td>
      <td className="p-3 text-right">{agent.totalTrades}</td>
      <td className="p-3 text-right">${agent.currentValue.toLocaleString()}</td>
      <td className="p-3 text-right">{agent.uptime.toFixed(1)}%</td>
      <td className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails?.(agent)}>
              View Details
            </DropdownMenuItem>
            {agent.status === 'active' ? (
              <DropdownMenuItem onClick={() => handleAgentAction(agent.id, 'pause')}>
                Pause
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleAgentAction(agent.id, 'start')}>
                Start
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleAgentAction(agent.id, 'configure')}>
              Configure
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{portfolioStats.totalAgents}</div>
            <div className="text-xs text-muted-foreground">Total Agents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{portfolioStats.activeAgents}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">${portfolioStats.totalCapital.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Capital</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">${portfolioStats.totalValue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Current Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={cn(
              'text-2xl font-bold',
              portfolioStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {portfolioStats.totalPnL >= 0 ? '+' : ''}${portfolioStats.totalPnL.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total P&L</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{portfolioStats.totalTrades}</div>
            <div className="text-xs text-muted-foreground">Total Trades</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={cn(
              'text-2xl font-bold',
              portfolioStats.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {portfolioStats.avgReturn >= 0 ? '+' : ''}{(portfolioStats.avgReturn * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Avg Return</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Agent Management</CardTitle>
            <div className="flex items-center gap-2">
              {/* Bulk Actions */}
              {selectedAgents.length > 0 && (
                <div className="flex items-center gap-1">
                  <Button size="sm" onClick={() => handleBulkAction('start')}>
                    Start ({selectedAgents.length})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('pause')}>
                    Pause
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('stop')}>
                    Stop
                  </Button>
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
              </div>
            </div>
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-wrap items-center gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="momentum">Momentum</SelectItem>
                <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                <SelectItem value="arbitrage">Arbitrage</SelectItem>
                <SelectItem value="market_making">Market Making</SelectItem>
                <SelectItem value="sentiment">Sentiment</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="fundamental">Fundamental</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">Total Return</SelectItem>
                <SelectItem value="daily_return">Daily Return</SelectItem>
                <SelectItem value="sharpe_ratio">Sharpe Ratio</SelectItem>
                <SelectItem value="profit_factor">Profit Factor</SelectItem>
                <SelectItem value="trades">Total Trades</SelectItem>
                <SelectItem value="uptime">Uptime</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch
                id="realtime"
                checked={enableRealTimeUpdates}
                onCheckedChange={() => {}}
                disabled
              />
              <Label htmlFor="realtime" className="text-sm">Real-time Updates</Label>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAgents.map(renderAgentCard)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Agent</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Total Return</th>
                    <th className="text-right p-3">Daily Return</th>
                    <th className="text-right p-3">Sharpe</th>
                    <th className="text-right p-3">Win Rate</th>
                    <th className="text-right p-3">Trades</th>
                    <th className="text-right p-3">Value</th>
                    <th className="text-right p-3">Uptime</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map(renderAgentRow)}
                </tbody>
              </table>
            </div>
          )}

          {filteredAgents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No agents found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Utility function to generate mock agent data
export function generateMockAgentData(count: number = 12): Agent[] {
  const agentTypes: Agent['type'][] = ['momentum', 'mean_reversion', 'arbitrage', 'market_making', 'sentiment', 'technical', 'fundamental'];
  const statuses: Agent['status'][] = ['active', 'paused', 'stopped', 'error'];
  const healthLevels: Agent['health'][] = ['excellent', 'good', 'warning', 'critical'];
  const riskLevels: Agent['riskLevel'][] = ['low', 'medium', 'high'];
  const symbols = ['BTC', 'ETH', 'AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA'];
  
  return Array.from({ length: count }, (_, i) => {
    const allocatedCapital = Math.random() * 100000 + 10000;
    const totalReturn = (Math.random() - 0.3) * 0.5; // -20% to +20% bias toward positive
    const currentValue = allocatedCapital * (1 + totalReturn);
    const unrealizedPnL = (Math.random() - 0.5) * allocatedCapital * 0.1;
    const realizedPnL = currentValue - allocatedCapital - unrealizedPnL;
    
    return {
      id: `agent_${i + 1}`,
      name: `Agent ${i + 1} - ${agentTypes[i % agentTypes.length].replace('_', ' ')}`,
      type: agentTypes[i % agentTypes.length],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      health: healthLevels[Math.floor(Math.random() * healthLevels.length)],
      
      totalReturn,
      dailyReturn: (Math.random() - 0.5) * 0.05, // ±2.5%
      winRate: Math.random() * 0.4 + 0.4, // 40-80%
      sharpeRatio: Math.random() * 3,
      maxDrawdown: Math.random() * 0.2,
      profitFactor: Math.random() * 2 + 0.5,
      
      allocatedCapital,
      currentValue,
      unrealizedPnL,
      realizedPnL,
      positionsCount: Math.floor(Math.random() * 10),
      ordersCount: Math.floor(Math.random() * 5),
      
      totalTrades: Math.floor(Math.random() * 1000),
      tradesThisWeek: Math.floor(Math.random() * 50),
      avgTradeSize: Math.random() * 10000 + 500,
      lastTradeTime: new Date(Date.now() - Math.random() * 86400000),
      uptime: Math.random() * 20 + 80, // 80-100%
      
      riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
      utilization: Math.random() * 100,
      maxLossLimit: allocatedCapital * 0.1,
      currentLoss: Math.random() * allocatedCapital * 0.05,
      
      symbols: symbols.slice(0, Math.floor(Math.random() * 4) + 1),
      strategies: [`Strategy ${i + 1}`],
      riskParameters: {
        maxPositionSize: Math.random() * 10000 + 1000,
        stopLoss: Math.random() * 0.05 + 0.02,
        takeProfit: Math.random() * 0.1 + 0.05,
        maxDailyLoss: Math.random() * 1000 + 500,
      },
      
      lastHeartbeat: new Date(Date.now() - Math.random() * 60000),
      errorCount: Math.floor(Math.random() * 5),
      warningCount: Math.floor(Math.random() * 10),
      decisionsThisHour: Math.floor(Math.random() * 100),
    };
  });
}