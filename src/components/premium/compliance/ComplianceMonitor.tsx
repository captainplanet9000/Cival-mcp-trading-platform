'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Info,
  FileText,
  Activity,
  TrendingUp,
  Clock,
  Filter
} from 'lucide-react';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend
} from 'recharts';

interface ComplianceRule {
  id: string;
  name: string;
  category: 'trading' | 'risk' | 'reporting' | 'kyc' | 'aml';
  status: 'compliant' | 'warning' | 'violation' | 'pending';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  lastChecked: Date;
  nextCheck: Date;
  threshold?: number;
  currentValue?: number;
  automatedCheck: boolean;
}

interface ComplianceViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedEntities: string[];
  status: 'open' | 'investigating' | 'resolved';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
}

interface ComplianceMetrics {
  overallScore: number;
  categoryScores: Record<string, number>;
  totalRules: number;
  compliantRules: number;
  warningRules: number;
  violationRules: number;
  pendingChecks: number;
  recentViolations: number;
  avgResolutionTime: number;
}

interface RegulatoryFramework {
  id: string;
  name: string;
  region: string;
  rules: string[];
  lastUpdated: Date;
  complianceLevel: number;
}

const mockRules: ComplianceRule[] = [
  {
    id: 'rule-1',
    name: 'Position Size Limit',
    category: 'trading',
    status: 'compliant',
    severity: 'high',
    description: 'No single position should exceed 10% of portfolio value',
    lastChecked: new Date(Date.now() - 1000 * 60 * 30),
    nextCheck: new Date(Date.now() + 1000 * 60 * 30),
    threshold: 10,
    currentValue: 7.2,
    automatedCheck: true
  },
  {
    id: 'rule-2',
    name: 'Daily Loss Limit',
    category: 'risk',
    status: 'warning',
    severity: 'critical',
    description: 'Daily losses should not exceed 2% of portfolio',
    lastChecked: new Date(Date.now() - 1000 * 60 * 15),
    nextCheck: new Date(Date.now() + 1000 * 60 * 45),
    threshold: 2,
    currentValue: 1.8,
    automatedCheck: true
  },
  {
    id: 'rule-3',
    name: 'Trade Reporting',
    category: 'reporting',
    status: 'compliant',
    severity: 'medium',
    description: 'All trades must be reported within T+1',
    lastChecked: new Date(Date.now() - 1000 * 60 * 60),
    nextCheck: new Date(Date.now() + 1000 * 60 * 60 * 23),
    automatedCheck: false
  },
  {
    id: 'rule-4',
    name: 'KYC Verification',
    category: 'kyc',
    status: 'pending',
    severity: 'high',
    description: 'All clients must have completed KYC verification',
    lastChecked: new Date(Date.now() - 1000 * 60 * 60 * 24),
    nextCheck: new Date(Date.now() + 1000 * 60 * 60),
    automatedCheck: false
  },
  {
    id: 'rule-5',
    name: 'Suspicious Activity Monitoring',
    category: 'aml',
    status: 'compliant',
    severity: 'critical',
    description: 'Monitor and report suspicious trading patterns',
    lastChecked: new Date(Date.now() - 1000 * 60 * 45),
    nextCheck: new Date(Date.now() + 1000 * 60 * 15),
    automatedCheck: true
  }
];

const mockViolations: ComplianceViolation[] = [
  {
    id: 'viol-1',
    ruleId: 'rule-2',
    ruleName: 'Daily Loss Limit',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    severity: 'high',
    description: 'Daily loss exceeded 1.5% threshold at 1.8%',
    affectedEntities: ['Portfolio-001', 'Strategy-Alpha'],
    status: 'investigating',
    resolution: undefined
  },
  {
    id: 'viol-2',
    ruleId: 'rule-1',
    ruleName: 'Position Size Limit',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    severity: 'medium',
    description: 'AAPL position reached 9.8% of portfolio',
    affectedEntities: ['AAPL', 'Portfolio-001'],
    status: 'resolved',
    resolution: 'Position reduced to 8.5% through partial sale',
    resolvedBy: 'Risk Manager',
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 20)
  }
];

const generateComplianceTrend = () => {
  const data = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString(),
      score: 85 + Math.random() * 10,
      violations: Math.floor(Math.random() * 5)
    });
  }
  return data;
};

const categoryColors = {
  trading: '#3b82f6',
  risk: '#f59e0b',
  reporting: '#10b981',
  kyc: '#8b5cf6',
  aml: '#ef4444'
};

const severityColors = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444'
};

export function ComplianceMonitor() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [rules, setRules] = useState<ComplianceRule[]>(mockRules);
  const [violations, setViolations] = useState<ComplianceViolation[]>(mockViolations);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [metrics, setMetrics] = useState<ComplianceMetrics>({
    overallScore: 88,
    categoryScores: {
      trading: 92,
      risk: 85,
      reporting: 90,
      kyc: 88,
      aml: 95
    },
    totalRules: mockRules.length,
    compliantRules: mockRules.filter(r => r.status === 'compliant').length,
    warningRules: mockRules.filter(r => r.status === 'warning').length,
    violationRules: mockRules.filter(r => r.status === 'violation').length,
    pendingChecks: mockRules.filter(r => r.status === 'pending').length,
    recentViolations: 2,
    avgResolutionTime: 4.2
  });
  const [trendData] = useState(generateComplianceTrend());

  const performanceMetrics = usePerformanceMonitor('ComplianceMonitor');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to compliance updates
    wsClient.subscribe('compliance.update', (data: any) => {
      if (data.rule) {
        setRules(prev => prev.map(r => r.id === data.rule.id ? data.rule : r));
      }
      if (data.violation) {
        setViolations(prev => [data.violation, ...prev]);
      }
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    });

    return () => {
      wsClient.unsubscribe('compliance.update');
    };
  }, []);

  const filteredRules = rules.filter(rule => {
    if (selectedCategory !== 'all' && rule.category !== selectedCategory) return false;
    if (selectedSeverity !== 'all' && rule.severity !== selectedSeverity) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'violation':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    return (
      <Badge 
        variant="outline"
        style={{ 
          borderColor: severityColors[severity as keyof typeof severityColors],
          color: severityColors[severity as keyof typeof severityColors]
        }}
      >
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const categoryData = Object.entries(metrics.categoryScores).map(([category, score]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    score,
    color: categoryColors[category as keyof typeof categoryColors]
  }));

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-500" />
              Compliance Monitor
            </h2>
            <p className="text-sm text-muted-foreground">
              Real-time regulatory compliance tracking and monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="trading">Trading</SelectItem>
                <SelectItem value="risk">Risk</SelectItem>
                <SelectItem value="reporting">Reporting</SelectItem>
                <SelectItem value="kyc">KYC</SelectItem>
                <SelectItem value="aml">AML</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Overall Compliance Score */}
        <Card className="premium-gradient">
          <CardHeader>
            <CardTitle>Overall Compliance Score</CardTitle>
            <CardDescription>Aggregate compliance health across all categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - metrics.overallScore / 100)}`}
                      className="text-blue-500 transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold">{metrics.overallScore}%</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Compliance Score</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Compliant Rules</span>
                  <span className="text-sm font-medium text-green-500">{metrics.compliantRules}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Warning Rules</span>
                  <span className="text-sm font-medium text-yellow-500">{metrics.warningRules}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Violations</span>
                  <span className="text-sm font-medium text-red-500">{metrics.violationRules}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending Checks</span>
                  <span className="text-sm font-medium text-blue-500">{metrics.pendingChecks}</span>
                </div>
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="score"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Tabs */}
        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rules">Compliance Rules</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredRules.map((rule) => (
                  <Card key={rule.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getStatusIcon(rule.status)}
                          <div className="space-y-1">
                            <h4 className="font-medium">{rule.name}</h4>
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <Badge variant="secondary">{rule.category}</Badge>
                              {getSeverityBadge(rule.severity)}
                              <span className="text-xs text-muted-foreground">
                                Last checked: {rule.lastChecked.toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {rule.threshold && rule.currentValue && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {rule.currentValue}% / {rule.threshold}%
                              </p>
                              <Progress 
                                value={(rule.currentValue / rule.threshold) * 100} 
                                className="w-24"
                              />
                            </div>
                          )}
                          <Badge variant={rule.automatedCheck ? "default" : "outline"} className="mt-2">
                            {rule.automatedCheck ? "Automated" : "Manual"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="violations" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {violations.map((violation) => (
                  <Alert key={violation.id} variant={violation.status === 'open' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center justify-between">
                      <span>{violation.ruleName}</span>
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(violation.severity)}
                        <Badge variant={violation.status === 'resolved' ? 'secondary' : 'destructive'}>
                          {violation.status}
                        </Badge>
                      </div>
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      <p>{violation.description}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Affected: {violation.affectedEntities.join(', ')}</p>
                        <p>Time: {violation.timestamp.toLocaleString()}</p>
                        {violation.resolution && (
                          <div className="mt-2 p-2 bg-muted rounded">
                            <p className="font-medium">Resolution:</p>
                            <p>{violation.resolution}</p>
                            <p className="text-xs mt-1">
                              Resolved by {violation.resolvedBy} at {violation.resolvedAt?.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Score Trend</CardTitle>
                <CardDescription>30-day compliance score and violation history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#3b82f6" 
                        name="Compliance Score (%)"
                        strokeWidth={2}
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="violations" 
                        stroke="#ef4444" 
                        name="Violations"
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
                  <CardTitle>Violations by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { category: 'Trading', count: 12 },
                        { category: 'Risk', count: 8 },
                        { category: 'Reporting', count: 5 },
                        { category: 'KYC', count: 3 },
                        { category: 'AML', count: 2 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Recent Violations (7d)</span>
                    <span className="text-lg font-bold">{metrics.recentViolations}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Resolution Time</span>
                    <span className="text-lg font-bold">{metrics.avgResolutionTime}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Automated Checks</span>
                    <span className="text-lg font-bold">
                      {rules.filter(r => r.automatedCheck).length}/{rules.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Next Check Due</span>
                    <span className="text-lg font-bold">15m</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PremiumThemeProvider>
  );
}