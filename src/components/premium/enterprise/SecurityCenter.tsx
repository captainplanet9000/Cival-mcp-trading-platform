'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  Shield, 
  Lock, 
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  Wifi,
  Database,
  FileShield,
  UserCheck,
  Settings,
  RefreshCw
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

interface SecurityPolicy {
  id: string;
  name: string;
  category: 'authentication' | 'authorization' | 'encryption' | 'network' | 'data' | 'compliance';
  status: 'enabled' | 'disabled' | 'warning';
  enforced: boolean;
  lastUpdated: Date;
  compliance: string[];
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityThreat {
  id: string;
  type: 'malware' | 'phishing' | 'bruteforce' | 'ddos' | 'insider' | 'vulnerability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'mitigated' | 'resolved';
  source: string;
  target: string;
  timestamp: Date;
  description: string;
  impact: string;
  mitigation: string[];
}

interface SecurityMetrics {
  overallScore: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  incidentsToday: number;
  blockedAttacks: number;
  complianceScore: number;
  encryptionCoverage: number;
}

interface AccessControl {
  id: string;
  resource: string;
  user: string;
  permission: 'read' | 'write' | 'execute' | 'admin';
  granted: boolean;
  source: 'role' | 'direct' | 'inherited';
  lastAccessed: Date;
  expiry?: Date;
}

interface NetworkSecurity {
  firewallStatus: 'active' | 'inactive' | 'warning';
  openPorts: number[];
  blockedIPs: string[];
  allowedIPs: string[];
  sslCertificates: SSLCertificate[];
  vpnConnections: number;
  intrusionAttempts: number;
}

interface SSLCertificate {
  domain: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  status: 'valid' | 'expiring' | 'expired' | 'invalid';
  daysUntilExpiry: number;
}

const mockPolicies: SecurityPolicy[] = [
  {
    id: 'policy-1',
    name: 'Multi-Factor Authentication',
    category: 'authentication',
    status: 'enabled',
    enforced: true,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    compliance: ['SOX', 'PCI-DSS', 'ISO-27001'],
    description: 'Require MFA for all user logins and administrative access',
    riskLevel: 'high'
  },
  {
    id: 'policy-2',
    name: 'Data Encryption at Rest',
    category: 'encryption',
    status: 'enabled',
    enforced: true,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    compliance: ['GDPR', 'SOX', 'HIPAA'],
    description: 'All sensitive data must be encrypted using AES-256',
    riskLevel: 'critical'
  },
  {
    id: 'policy-3',
    name: 'Network Segmentation',
    category: 'network',
    status: 'enabled',
    enforced: true,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    compliance: ['PCI-DSS', 'ISO-27001'],
    description: 'Isolate trading systems from general corporate network',
    riskLevel: 'high'
  },
  {
    id: 'policy-4',
    name: 'Regular Security Audits',
    category: 'compliance',
    status: 'warning',
    enforced: false,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    compliance: ['SOX', 'ISO-27001'],
    description: 'Quarterly security assessments and penetration testing',
    riskLevel: 'medium'
  }
];

const mockThreats: SecurityThreat[] = [
  {
    id: 'threat-1',
    type: 'bruteforce',
    severity: 'high',
    status: 'mitigated',
    source: '203.0.113.45',
    target: 'Authentication Service',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    description: 'Multiple failed login attempts detected from suspicious IP',
    impact: 'Potential unauthorized access attempt',
    mitigation: ['IP blocked', 'Rate limiting applied', 'Account temporarily locked']
  },
  {
    id: 'threat-2',
    type: 'vulnerability',
    severity: 'critical',
    status: 'investigating',
    source: 'Security Scanner',
    target: 'Trading API',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    description: 'SQL injection vulnerability detected in trading API endpoint',
    impact: 'Potential data breach and system compromise',
    mitigation: ['Endpoint disabled', 'Patch being developed', 'WAF rules updated']
  },
  {
    id: 'threat-3',
    type: 'ddos',
    severity: 'medium',
    status: 'resolved',
    source: 'Multiple IPs',
    target: 'Load Balancer',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    description: 'Distributed denial of service attack targeting main endpoints',
    impact: 'Temporary service degradation',
    mitigation: ['Traffic filtered', 'Rate limiting increased', 'CDN protection activated']
  }
];

const mockAccessControls: AccessControl[] = [
  {
    id: 'access-1',
    resource: 'Trading Dashboard',
    user: 'solo-operator',
    permission: 'admin',
    granted: true,
    source: 'direct',
    lastAccessed: new Date(Date.now() - 1000 * 60 * 15)
  },
  {
    id: 'access-2',
    resource: 'Market Data API',
    user: 'solo-operator',
    permission: 'read',
    granted: true,
    source: 'role',
    lastAccessed: new Date(Date.now() - 1000 * 60 * 5)
  },
  {
    id: 'access-3',
    resource: 'Risk Management',
    user: 'solo-operator',
    permission: 'write',
    granted: true,
    source: 'role',
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60)
  }
];

const mockNetworkSecurity: NetworkSecurity = {
  firewallStatus: 'active',
  openPorts: [443, 8080, 8081, 5432],
  blockedIPs: ['203.0.113.45', '198.51.100.23', '192.0.2.146'],
  allowedIPs: ['127.0.0.1', '192.168.1.0/24'],
  sslCertificates: [
    {
      domain: 'trading.local.dev',
      issuer: 'Let\'s Encrypt',
      validFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      validTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
      status: 'valid',
      daysUntilExpiry: 60
    },
    {
      domain: 'api.trading.local.dev',
      issuer: 'DigiCert',
      validFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
      validTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
      status: 'expiring',
      daysUntilExpiry: 15
    }
  ],
  vpnConnections: 0,
  intrusionAttempts: 23
};

const mockMetrics: SecurityMetrics = {
  overallScore: 87,
  vulnerabilities: {
    critical: 1,
    high: 3,
    medium: 8,
    low: 15
  },
  threatLevel: 'medium',
  incidentsToday: 3,
  blockedAttacks: 156,
  complianceScore: 92,
  encryptionCoverage: 95
};

const generateSecurityTrends = () => {
  const data = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString(),
      threats: Math.floor(Math.random() * 10) + 5,
      blocked: Math.floor(Math.random() * 50) + 20,
      vulnerabilities: Math.floor(Math.random() * 5) + 2,
      score: 80 + Math.random() * 15
    });
  }
  return data;
};

export function SecurityCenter() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [policies, setPolicies] = useState<SecurityPolicy[]>(mockPolicies);
  const [threats, setThreats] = useState<SecurityThreat[]>(mockThreats);
  const [accessControls] = useState<AccessControl[]>(mockAccessControls);
  const [networkSecurity] = useState<NetworkSecurity>(mockNetworkSecurity);
  const [metrics] = useState<SecurityMetrics>(mockMetrics);
  const [securityTrends] = useState(generateSecurityTrends());
  const [selectedThreat, setSelectedThreat] = useState<SecurityThreat | null>(null);
  const [showApiKeys, setShowApiKeys] = useState(false);

  const performanceMetrics = usePerformanceMonitor('SecurityCenter');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to security updates
    wsClient.subscribe('security.update', (data: any) => {
      if (data.threat) {
        setThreats(prev => [data.threat, ...prev.slice(0, 99)]);
      }
      if (data.policy) {
        setPolicies(prev => prev.map(p => p.id === data.policy.id ? data.policy : p));
      }
    });

    return () => {
      wsClient.unsubscribe('security.update');
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enabled':
      case 'valid':
      case 'active':
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
      case 'expiring':
      case 'investigating':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'disabled':
      case 'expired':
      case 'inactive':
      case 'detected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'text-green-500',
      medium: 'text-yellow-500',
      high: 'text-orange-500',
      critical: 'text-red-500'
    };
    return colors[severity as keyof typeof colors] || 'text-gray-500';
  };

  const getRiskColor = (level: string) => {
    const colors = {
      low: 'text-green-500',
      medium: 'text-yellow-500',
      high: 'text-orange-500',
      critical: 'text-red-500'
    };
    return colors[level as keyof typeof colors] || 'text-gray-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-yellow-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  const togglePolicy = (policyId: string) => {
    setPolicies(prev => prev.map(policy => 
      policy.id === policyId 
        ? { 
            ...policy, 
            status: policy.status === 'enabled' ? 'disabled' : 'enabled',
            enforced: policy.status === 'disabled'
          }
        : policy
    ));
  };

  const activePolicies = policies.filter(p => p.status === 'enabled');
  const criticalThreats = threats.filter(t => t.severity === 'critical' && t.status !== 'resolved');

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-500" />
              Security Center
            </h2>
            <p className="text-sm text-muted-foreground">
              Comprehensive security monitoring and threat management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Scan Now
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </div>
        </div>

        {/* Security Score */}
        <Card className="premium-gradient">
          <CardHeader>
            <CardTitle>Security Posture</CardTitle>
            <CardDescription>Overall security health and compliance status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                      className={`${getScoreColor(metrics.overallScore).replace('text-', 'text-')} transition-all duration-500`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold">{metrics.overallScore}%</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Overall Score</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Policies</span>
                  <span className="text-sm font-bold text-green-500">{activePolicies.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Critical Threats</span>
                  <span className="text-sm font-bold text-red-500">{criticalThreats.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Blocked Attacks</span>
                  <span className="text-sm font-bold text-blue-500">{metrics.blockedAttacks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Compliance Score</span>
                  <span className="text-sm font-bold text-green-500">{metrics.complianceScore}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Encryption Coverage</span>
                  <span className="text-sm font-bold">{metrics.encryptionCoverage}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Firewall Status</span>
                  <span className="text-sm font-bold text-green-500">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">SSL Certificates</span>
                  <span className="text-sm font-bold">{networkSecurity.sslCertificates.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Open Ports</span>
                  <span className="text-sm font-bold">{networkSecurity.openPorts.length}</span>
                </div>
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Critical', value: metrics.vulnerabilities.critical, color: '#ef4444' },
                        { name: 'High', value: metrics.vulnerabilities.high, color: '#f97316' },
                        { name: 'Medium', value: metrics.vulnerabilities.medium, color: '#f59e0b' },
                        { name: 'Low', value: metrics.vulnerabilities.low, color: '#10b981' }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label
                    >
                      {[
                        { name: 'Critical', value: metrics.vulnerabilities.critical, color: '#ef4444' },
                        { name: 'High', value: metrics.vulnerabilities.high, color: '#f97316' },
                        { name: 'Medium', value: metrics.vulnerabilities.medium, color: '#f59e0b' },
                        { name: 'Low', value: metrics.vulnerabilities.low, color: '#10b981' }
                      ].map((entry, index) => (
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

        {/* Critical Alerts */}
        {criticalThreats.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Security Threats</AlertTitle>
            <AlertDescription>
              {criticalThreats.length} critical security threat(s) require immediate attention. 
              Review and take appropriate action.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Tabs defaultValue="threats" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="threats">Threats</TabsTrigger>
                <TabsTrigger value="policies">Policies</TabsTrigger>
                <TabsTrigger value="access">Access</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>

              <TabsContent value="threats" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {threats.map((threat) => (
                      <Card 
                        key={threat.id}
                        className={`cursor-pointer transition-colors ${
                          selectedThreat?.id === threat.id ? 'border-primary' : ''
                        } ${threat.severity === 'critical' ? 'border-red-500' : ''}`}
                        onClick={() => setSelectedThreat(threat)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              {getStatusIcon(threat.status)}
                              <div>
                                <h4 className="font-medium">{threat.type.charAt(0).toUpperCase() + threat.type.slice(1)} Attack</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {threat.description}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline">{threat.type}</Badge>
                                  <Badge 
                                    variant={threat.severity === 'critical' ? 'destructive' : 'outline'}
                                    className={getSeverityColor(threat.severity)}
                                  >
                                    {threat.severity}
                                  </Badge>
                                  <Badge variant="secondary">{threat.status}</Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <p className="text-muted-foreground">Detected</p>
                              <p>{threat.timestamp.toLocaleTimeString()}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Source</p>
                              <p className="font-mono text-sm">{threat.source}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Target</p>
                              <p className="text-sm">{threat.target}</p>
                            </div>
                          </div>

                          <div className="mb-3">
                            <p className="text-sm text-muted-foreground">Impact</p>
                            <p className="text-sm">{threat.impact}</p>
                          </div>

                          {threat.mitigation.length > 0 && (
                            <div className="pt-3 border-t">
                              <p className="text-sm text-muted-foreground mb-1">Mitigation Actions</p>
                              <div className="space-y-1">
                                {threat.mitigation.map((action, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    <span className="text-sm">{action}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="policies" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {policies.map((policy) => (
                      <Card key={policy.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              {getStatusIcon(policy.status)}
                              <div>
                                <h4 className="font-medium">{policy.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {policy.description}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline">{policy.category}</Badge>
                                  <Badge 
                                    variant={policy.status === 'enabled' ? 'default' : 'secondary'}
                                  >
                                    {policy.status}
                                  </Badge>
                                  <Badge 
                                    variant="outline"
                                    className={getRiskColor(policy.riskLevel)}
                                  >
                                    {policy.riskLevel} risk
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Switch 
                              checked={policy.status === 'enabled'}
                              onCheckedChange={() => togglePolicy(policy.id)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Enforced</p>
                              <p className="text-sm font-medium">
                                {policy.enforced ? 'Yes' : 'No'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Last Updated</p>
                              <p className="text-sm font-medium">
                                {policy.lastUpdated.toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {policy.compliance.length > 0 && (
                            <div className="pt-3 border-t">
                              <p className="text-sm text-muted-foreground mb-1">Compliance Standards</p>
                              <div className="flex flex-wrap gap-1">
                                {policy.compliance.map((standard, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {standard}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="access" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Access Control Matrix</CardTitle>
                    <CardDescription>Resource permissions and access history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-3">
                        {accessControls.map((access) => (
                          <div key={access.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                              <UserCheck className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="font-medium">{access.resource}</p>
                                <p className="text-sm text-muted-foreground">
                                  User: {access.user} | Permission: {access.permission}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={access.granted ? 'default' : 'destructive'}>
                                {access.granted ? 'Granted' : 'Denied'}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {access.lastAccessed.toLocaleTimeString()}
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
                    <CardTitle>API Keys & Tokens</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Show API Keys</Label>
                      <Switch checked={showApiKeys} onCheckedChange={setShowApiKeys} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Trading API Key</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {showApiKeys ? 'sk_live_1234567890abcdef' : '••••••••••••••••'}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => setShowApiKeys(!showApiKeys)}>
                            {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Market Data Token</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {showApiKeys ? 'md_token_abcdef123456' : '••••••••••••••••'}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => setShowApiKeys(!showApiKeys)}>
                            {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="network" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wifi className="h-4 w-4" />
                        Firewall Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Status</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Open Ports</span>
                          <span className="text-sm font-bold">{networkSecurity.openPorts.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Blocked IPs</span>
                          <span className="text-sm font-bold">{networkSecurity.blockedIPs.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Intrusion Attempts</span>
                          <span className="text-sm font-bold text-red-500">{networkSecurity.intrusionAttempts}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileShield className="h-4 w-4" />
                        SSL Certificates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {networkSecurity.sslCertificates.map((cert, index) => (
                          <div key={index} className="border rounded p-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm">{cert.domain}</p>
                                <p className="text-xs text-muted-foreground">{cert.issuer}</p>
                              </div>
                              <Badge 
                                variant={cert.status === 'valid' ? 'default' : 
                                        cert.status === 'expiring' ? 'outline' : 'destructive'}
                              >
                                {cert.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires in {cert.daysUntilExpiry} days
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Network Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium mb-2">Open Ports</h5>
                        <div className="space-y-1">
                          {networkSecurity.openPorts.map((port, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span>Port {port}</span>
                              <Badge variant="outline">
                                {port === 443 ? 'HTTPS' : port === 8080 ? 'HTTP' : port === 5432 ? 'PostgreSQL' : 'Custom'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Blocked IPs</h5>
                        <div className="space-y-1">
                          {networkSecurity.blockedIPs.slice(0, 3).map((ip, index) => (
                            <div key={index} className="text-sm font-mono">
                              {ip}
                            </div>
                          ))}
                          {networkSecurity.blockedIPs.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{networkSecurity.blockedIPs.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Trends</CardTitle>
                    <CardDescription>30-day security metrics and threat landscape</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={securityTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="threats" 
                            stroke="#ef4444" 
                            name="Threats Detected"
                            strokeWidth={2}
                          />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="blocked" 
                            stroke="#10b981" 
                            name="Attacks Blocked"
                            strokeWidth={2}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="score" 
                            stroke="#3b82f6" 
                            name="Security Score"
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
                <CardTitle>Threat Level</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className={`text-4xl font-bold mb-2 ${getRiskColor(metrics.threatLevel)}`}>
                  {metrics.threatLevel.toUpperCase()}
                </div>
                <p className="text-sm text-muted-foreground">Current threat assessment</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Active Threats</span>
                    <span className="font-bold">{threats.filter(t => t.status === 'detected').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Incidents Today</span>
                    <span className="font-bold">{metrics.incidentsToday}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" size="sm">
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Run Security Scan
                </Button>
                <Button className="w-full" size="sm" variant="outline">
                  <Lock className="h-4 w-4 mr-2" />
                  Update Policies
                </Button>
                <Button className="w-full" size="sm" variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Rotate API Keys
                </Button>
                <Button className="w-full" size="sm" variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  Backup Security Config
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Security Score</span>
                  <span className={`text-sm font-bold ${getScoreColor(metrics.overallScore)}`}>
                    {metrics.overallScore}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Compliance</span>
                  <span className="text-sm font-bold text-green-500">{metrics.complianceScore}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Encryption</span>
                  <span className="text-sm font-bold">{metrics.encryptionCoverage}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Last Scan</span>
                  <span className="text-sm font-bold">2 hours ago</span>
                </div>
              </CardContent>
            </Card>

            {selectedThreat && (
              <Card>
                <CardHeader>
                  <CardTitle>Threat Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{selectedThreat.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Severity</p>
                    <p className={`font-medium ${getSeverityColor(selectedThreat.severity)}`}>
                      {selectedThreat.severity.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Source</p>
                    <p className="font-mono text-sm">{selectedThreat.source}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Target</p>
                    <p className="text-sm">{selectedThreat.target}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={selectedThreat.status === 'resolved' ? 'default' : 'destructive'}>
                      {selectedThreat.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PremiumThemeProvider>
  );
}