'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  Shield, 
  Key, 
  Users, 
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Link,
  Unlink,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Edit3,
  Trash2
} from 'lucide-react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend
} from 'recharts';

interface SSOProvider {
  id: string;
  name: string;
  type: 'saml' | 'oidc' | 'oauth2' | 'ldap' | 'ad';
  status: 'active' | 'inactive' | 'error' | 'configuring';
  domain: string;
  userCount: number;
  lastSync: Date;
  config: SSOConfig;
  metadata: ProviderMetadata;
}

interface SSOConfig {
  entityId?: string;
  ssoUrl?: string;
  sloUrl?: string;
  certificateFingerprint?: string;
  clientId?: string;
  clientSecret?: string;
  discoveryUrl?: string;
  issuer?: string;
  jwksUri?: string;
  ldapUrl?: string;
  baseDn?: string;
  bindDn?: string;
  userSearchFilter?: string;
  groupSearchFilter?: string;
  autoProvisioning: boolean;
  defaultRole: string;
  attributeMapping: AttributeMapping;
}

interface AttributeMapping {
  email: string;
  firstName: string;
  lastName: string;
  groups: string;
  department?: string;
  title?: string;
}

interface ProviderMetadata {
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastTestedAt?: Date;
  testResults?: TestResult[];
}

interface TestResult {
  timestamp: Date;
  success: boolean;
  responseTime: number;
  errorMessage?: string;
}

interface SSOSession {
  id: string;
  userId: string;
  userEmail: string;
  provider: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

interface SSOAnalytics {
  totalLogins: number;
  activeUsers: number;
  activeSessions: number;
  avgSessionDuration: number;
  providerUsage: ProviderUsage[];
  loginTrends: LoginTrend[];
  errorRates: ErrorRate[];
}

interface ProviderUsage {
  provider: string;
  users: number;
  logins: number;
  percentage: number;
}

interface LoginTrend {
  date: string;
  logins: number;
  uniqueUsers: number;
  errors: number;
}

interface ErrorRate {
  provider: string;
  errors: number;
  total: number;
  rate: number;
}

const mockProviders: SSOProvider[] = [
  {
    id: 'provider-1',
    name: 'Corporate Azure AD',
    type: 'saml',
    status: 'active',
    domain: 'company.com',
    userCount: 245,
    lastSync: new Date(Date.now() - 1000 * 60 * 30),
    config: {
      entityId: 'https://company.com/saml',
      ssoUrl: 'https://login.microsoftonline.com/tenant-id/saml2',
      sloUrl: 'https://login.microsoftonline.com/tenant-id/saml2/logout',
      certificateFingerprint: 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD',
      autoProvisioning: true,
      defaultRole: 'trader',
      attributeMapping: {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
        groups: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
        department: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/department'
      }
    },
    metadata: {
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      createdBy: 'admin@company.com',
      lastTestedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      testResults: [
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
          success: true,
          responseTime: 450
        }
      ]
    }
  },
  {
    id: 'provider-2',
    name: 'Google Workspace',
    type: 'oidc',
    status: 'active',
    domain: 'company.com',
    userCount: 89,
    lastSync: new Date(Date.now() - 1000 * 60 * 15),
    config: {
      clientId: 'google-client-id.googleusercontent.com',
      clientSecret: '••••••••••••••••••••••••',
      discoveryUrl: 'https://accounts.google.com/.well-known/openid_configuration',
      issuer: 'https://accounts.google.com',
      autoProvisioning: false,
      defaultRole: 'analyst',
      attributeMapping: {
        email: 'email',
        firstName: 'given_name',
        lastName: 'family_name',
        groups: 'groups'
      }
    },
    metadata: {
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      createdBy: 'admin@company.com',
      lastTestedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      testResults: [
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          success: true,
          responseTime: 320
        }
      ]
    }
  },
  {
    id: 'provider-3',
    name: 'LDAP Directory',
    type: 'ldap',
    status: 'error',
    domain: 'internal.company.com',
    userCount: 156,
    lastSync: new Date(Date.now() - 1000 * 60 * 60 * 4),
    config: {
      ldapUrl: 'ldaps://ldap.internal.company.com:636',
      baseDn: 'dc=company,dc=com',
      bindDn: 'cn=service,ou=system,dc=company,dc=com',
      userSearchFilter: '(&(objectClass=person)(mail=*))',
      groupSearchFilter: '(objectClass=groupOfNames)',
      autoProvisioning: true,
      defaultRole: 'viewer',
      attributeMapping: {
        email: 'mail',
        firstName: 'givenName',
        lastName: 'sn',
        groups: 'memberOf',
        department: 'department'
      }
    },
    metadata: {
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      createdBy: 'admin@company.com',
      lastTestedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      testResults: [
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
          success: false,
          responseTime: 5000,
          errorMessage: 'Connection timeout - unable to reach LDAP server'
        }
      ]
    }
  }
];

const mockSessions: SSOSession[] = [
  {
    id: 'session-1',
    userId: 'user-001',
    userEmail: 'john.doe@company.com',
    provider: 'Corporate Azure AD',
    loginTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
    lastActivity: new Date(Date.now() - 1000 * 60 * 15),
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    isActive: true
  },
  {
    id: 'session-2',
    userId: 'user-002',
    userEmail: 'jane.smith@company.com',
    provider: 'Google Workspace',
    loginTime: new Date(Date.now() - 1000 * 60 * 60 * 1),
    lastActivity: new Date(Date.now() - 1000 * 60 * 5),
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
    isActive: true
  }
];

const mockAnalytics: SSOAnalytics = {
  totalLogins: 1245,
  activeUsers: 389,
  activeSessions: 156,
  avgSessionDuration: 3.2,
  providerUsage: [
    { provider: 'Azure AD', users: 245, logins: 789, percentage: 63.4 },
    { provider: 'Google', users: 89, logins: 312, percentage: 25.1 },
    { provider: 'LDAP', users: 156, logins: 144, percentage: 11.5 }
  ],
  loginTrends: [],
  errorRates: [
    { provider: 'Azure AD', errors: 12, total: 789, rate: 1.5 },
    { provider: 'Google', errors: 8, total: 312, rate: 2.6 },
    { provider: 'LDAP', errors: 45, total: 144, rate: 31.3 }
  ]
};

// Generate login trends
for (let i = 30; i >= 0; i--) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  mockAnalytics.loginTrends.push({
    date: date.toLocaleDateString(),
    logins: Math.floor(Math.random() * 50) + 20,
    uniqueUsers: Math.floor(Math.random() * 30) + 15,
    errors: Math.floor(Math.random() * 8)
  });
}

export function EnterpriseSSO() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [providers, setProviders] = useState<SSOProvider[]>(mockProviders);
  const [sessions, setSessions] = useState<SSOSession[]>(mockSessions);
  const [analytics] = useState<SSOAnalytics>(mockAnalytics);
  const [selectedProvider, setSelectedProvider] = useState<SSOProvider | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const performanceMetrics = usePerformanceMonitor('EnterpriseSSO');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to SSO updates
    wsClient.subscribe('sso.update', (data: any) => {
      if (data.provider) {
        setProviders(prev => prev.map(p => p.id === data.provider.id ? data.provider : p));
      }
      if (data.session) {
        setSessions(prev => [data.session, ...prev.slice(0, 99)]);
      }
    });

    return () => {
      wsClient.unsubscribe('sso.update');
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'configuring':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'default',
      inactive: 'secondary',
      error: 'destructive',
      configuring: 'outline'
    };
    return <Badge variant={colors[status as keyof typeof colors] as any}>{status}</Badge>;
  };

  const testConnection = async (providerId: string) => {
    setTestingProvider(providerId);
    
    // Simulate connection test
    setTimeout(() => {
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? {
              ...p,
              metadata: {
                ...p.metadata,
                lastTestedAt: new Date(),
                testResults: [
                  {
                    timestamp: new Date(),
                    success: Math.random() > 0.2,
                    responseTime: Math.floor(Math.random() * 1000) + 200,
                    errorMessage: Math.random() > 0.8 ? 'Connection failed' : undefined
                  },
                  ...(p.metadata.testResults || []).slice(0, 9)
                ]
              }
            }
          : p
      ));
      setTestingProvider(null);
    }, 2000);
  };

  const toggleSecret = (fieldId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const providerStats = {
    total: providers.length,
    active: providers.filter(p => p.status === 'active').length,
    errors: providers.filter(p => p.status === 'error').length,
    totalUsers: providers.reduce((sum, p) => sum + p.userCount, 0)
  };

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-500" />
              Enterprise SSO
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage single sign-on providers and authentication configuration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add SSO Provider</DialogTitle>
                  <DialogDescription>
                    Configure a new single sign-on provider
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Provider Name</Label>
                      <Input placeholder="Enter provider name" />
                    </div>
                    <div>
                      <Label>Provider Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saml">SAML 2.0</SelectItem>
                          <SelectItem value="oidc">OpenID Connect</SelectItem>
                          <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                          <SelectItem value="ldap">LDAP</SelectItem>
                          <SelectItem value="ad">Active Directory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Domain</Label>
                    <Input placeholder="company.com" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-provision" />
                    <Label htmlFor="auto-provision">Enable auto-provisioning</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>
                    Create Provider
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Providers</p>
                  <p className="text-2xl font-bold">{providerStats.total}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Providers</p>
                  <p className="text-2xl font-bold text-green-500">{providerStats.active}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Sessions</p>
                  <p className="text-2xl font-bold">{analytics.activeSessions}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{providerStats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {providerStats.errors > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Provider Errors Detected</AlertTitle>
            <AlertDescription>
              {providerStats.errors} SSO provider(s) are experiencing connection issues. 
              Check configuration and test connections.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Tabs defaultValue="providers" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="providers">Providers</TabsTrigger>
                <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="providers" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {providers.map((provider) => (
                      <Card 
                        key={provider.id}
                        className={`cursor-pointer transition-colors ${
                          selectedProvider?.id === provider.id ? 'border-primary' : ''
                        }`}
                        onClick={() => setSelectedProvider(provider)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              {getStatusIcon(provider.status)}
                              <div>
                                <h4 className="font-medium">{provider.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">{provider.type.toUpperCase()}</Badge>
                                  {getStatusBadge(provider.status)}
                                  <span className="text-sm text-muted-foreground">
                                    {provider.domain}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={testingProvider === provider.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  testConnection(provider.id);
                                }}
                              >
                                {testingProvider === provider.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Edit provider
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Users</p>
                              <p className="text-lg font-bold">{provider.userCount}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Last Sync</p>
                              <p className="text-lg font-bold">
                                {Math.floor((Date.now() - provider.lastSync.getTime()) / (1000 * 60))}m ago
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Auto Provision</p>
                              <p className="text-lg font-bold">
                                {provider.config.autoProvisioning ? 'Enabled' : 'Disabled'}
                              </p>
                            </div>
                          </div>

                          {provider.metadata.testResults && provider.metadata.testResults.length > 0 && (
                            <div className="pt-3 border-t">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Last Test</span>
                                <div className="flex items-center gap-2">
                                  {provider.metadata.testResults[0].success ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  )}
                                  <span className="text-sm">
                                    {provider.metadata.testResults[0].responseTime}ms
                                  </span>
                                </div>
                              </div>
                              {provider.metadata.testResults[0].errorMessage && (
                                <p className="text-sm text-red-500 mt-1">
                                  {provider.metadata.testResults[0].errorMessage}
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="sessions" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <Card key={session.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium">{session.userEmail}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{session.provider}</Badge>
                                <Badge variant={session.isActive ? 'default' : 'secondary'}>
                                  {session.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Login Time:</span>
                                  <br />
                                  <span>{session.loginTime.toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Last Activity:</span>
                                  <br />
                                  <span>{session.lastActivity.toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">IP Address:</span>
                                  <br />
                                  <span className="font-mono">{session.ipAddress}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Duration:</span>
                                  <br />
                                  <span>
                                    {Math.floor((session.lastActivity.getTime() - session.loginTime.getTime()) / (1000 * 60 * 60))}h {Math.floor(((session.lastActivity.getTime() - session.loginTime.getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSessions(prev => prev.filter(s => s.id !== session.id));
                              }}
                            >
                              Terminate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Login Trends</CardTitle>
                    <CardDescription>Daily login activity and unique users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.loginTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="logins" 
                            stroke="#3b82f6" 
                            name="Total Logins"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="uniqueUsers" 
                            stroke="#10b981" 
                            name="Unique Users"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="errors" 
                            stroke="#ef4444" 
                            name="Errors"
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
                      <CardTitle>Provider Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analytics.providerUsage}
                              dataKey="percentage"
                              nameKey="provider"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percentage }) => `${name} ${percentage}%`}
                            >
                              {analytics.providerUsage.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={['#3b82f6', '#10b981', '#f59e0b'][index % 3]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Error Rates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.errorRates.map((error, index) => (
                          <div key={index}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">{error.provider}</span>
                              <span className="text-sm font-medium">{error.rate}%</span>
                            </div>
                            <Progress value={error.rate} max={50} className="h-2" />
                            <div className="text-xs text-muted-foreground mt-1">
                              {error.errors} errors / {error.total} attempts
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {selectedProvider ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Provider Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Provider Type</p>
                      <p className="font-medium">{selectedProvider.type.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Domain</p>
                      <p className="font-medium">{selectedProvider.domain}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Default Role</p>
                      <p className="font-medium">{selectedProvider.config.defaultRole}</p>
                    </div>
                    <Separator />
                    
                    {selectedProvider.type === 'saml' && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">Entity ID</Label>
                          <Input 
                            value={selectedProvider.config.entityId} 
                            readOnly 
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">SSO URL</Label>
                          <Input 
                            value={selectedProvider.config.ssoUrl} 
                            readOnly 
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Certificate Fingerprint</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={showSecrets[`cert-${selectedProvider.id}`] 
                                ? selectedProvider.config.certificateFingerprint 
                                : '••••••••••••••••••••••••••••••••••••••••'
                              }
                              readOnly 
                              className="text-sm font-mono"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSecret(`cert-${selectedProvider.id}`)}
                            >
                              {showSecrets[`cert-${selectedProvider.id}`] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedProvider.type === 'oidc' && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">Client ID</Label>
                          <Input 
                            value={selectedProvider.config.clientId} 
                            readOnly 
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Client Secret</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={showSecrets[`secret-${selectedProvider.id}`] 
                                ? 'actual-secret-value'
                                : selectedProvider.config.clientSecret
                              }
                              readOnly 
                              className="text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSecret(`secret-${selectedProvider.id}`)}
                            >
                              {showSecrets[`secret-${selectedProvider.id}`] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm">Discovery URL</Label>
                          <Input 
                            value={selectedProvider.config.discoveryUrl} 
                            readOnly 
                            className="text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {selectedProvider.type === 'ldap' && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">LDAP URL</Label>
                          <Input 
                            value={selectedProvider.config.ldapUrl} 
                            readOnly 
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Base DN</Label>
                          <Input 
                            value={selectedProvider.config.baseDn} 
                            readOnly 
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Bind DN</Label>
                          <Input 
                            value={selectedProvider.config.bindDn} 
                            readOnly 
                            className="text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Attribute Mapping</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm">Email</Label>
                      <Input 
                        value={selectedProvider.config.attributeMapping.email} 
                        readOnly 
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">First Name</Label>
                      <Input 
                        value={selectedProvider.config.attributeMapping.firstName} 
                        readOnly 
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Last Name</Label>
                      <Input 
                        value={selectedProvider.config.attributeMapping.lastName} 
                        readOnly 
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Groups</Label>
                      <Input 
                        value={selectedProvider.config.attributeMapping.groups} 
                        readOnly 
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Select a provider to view configuration</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Logins (24h)</span>
                  <span className="text-sm font-bold">{analytics.totalLogins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Users</span>
                  <span className="text-sm font-bold">{analytics.activeUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg Session Duration</span>
                  <span className="text-sm font-bold">{analytics.avgSessionDuration}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Success Rate</span>
                  <span className="text-sm font-bold text-green-500">96.8%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PremiumThemeProvider>
  );
}