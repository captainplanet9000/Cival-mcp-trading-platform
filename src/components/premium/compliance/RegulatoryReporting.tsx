'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { TradingWebSocketClient } from '@/lib/websocket/trading-client';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  FileText, 
  Download, 
  Upload, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  Send,
  Archive,
  Filter,
  Search,
  FileCheck
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

interface Report {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'adhoc';
  category: 'trading' | 'risk' | 'compliance' | 'financial' | 'audit';
  regulator: string;
  status: 'draft' | 'pending_review' | 'approved' | 'submitted' | 'overdue';
  dueDate: Date;
  submittedDate?: Date;
  frequency: string;
  lastGenerated?: Date;
  nextDue: Date;
  progress: number;
  sections: ReportSection[];
  attachments: Attachment[];
}

interface ReportSection {
  id: string;
  name: string;
  status: 'incomplete' | 'in_progress' | 'complete' | 'reviewed';
  required: boolean;
  completedBy?: string;
  completedAt?: Date;
  data?: any;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  type: string;
  regulator: string;
  sections: string[];
  requiredFields: string[];
  automationLevel: number;
}

interface SubmissionHistory {
  id: string;
  reportId: string;
  reportName: string;
  submittedAt: Date;
  submittedBy: string;
  regulator: string;
  status: 'accepted' | 'rejected' | 'pending' | 'acknowledged';
  feedback?: string;
}

const mockReports: Report[] = [
  {
    id: 'report-1',
    name: 'Daily Trading Activity Report',
    type: 'daily',
    category: 'trading',
    regulator: 'SEC',
    status: 'pending_review',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 8),
    frequency: 'Daily',
    lastGenerated: new Date(Date.now() - 1000 * 60 * 30),
    nextDue: new Date(Date.now() + 1000 * 60 * 60 * 24),
    progress: 85,
    sections: [
      { id: 's1', name: 'Trade Summary', status: 'complete', required: true },
      { id: 's2', name: 'Volume Analysis', status: 'complete', required: true },
      { id: 's3', name: 'Risk Metrics', status: 'in_progress', required: true },
      { id: 's4', name: 'Compliance Checks', status: 'incomplete', required: false }
    ],
    attachments: []
  },
  {
    id: 'report-2',
    name: 'Monthly Risk Assessment',
    type: 'monthly',
    category: 'risk',
    regulator: 'FINRA',
    status: 'approved',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
    frequency: 'Monthly',
    lastGenerated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    nextDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25),
    progress: 100,
    sections: [
      { id: 's1', name: 'Portfolio Risk', status: 'complete', required: true },
      { id: 's2', name: 'Market Risk', status: 'complete', required: true },
      { id: 's3', name: 'Operational Risk', status: 'complete', required: true },
      { id: 's4', name: 'Stress Testing', status: 'complete', required: true }
    ],
    attachments: [
      {
        id: 'att-1',
        name: 'stress_test_results.pdf',
        type: 'application/pdf',
        size: 2048576,
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        uploadedBy: 'Risk Manager'
      }
    ]
  },
  {
    id: 'report-3',
    name: 'Quarterly Compliance Report',
    type: 'quarterly',
    category: 'compliance',
    regulator: 'CFTC',
    status: 'draft',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    frequency: 'Quarterly',
    nextDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    progress: 25,
    sections: [
      { id: 's1', name: 'Regulatory Updates', status: 'complete', required: true },
      { id: 's2', name: 'Violation Summary', status: 'in_progress', required: true },
      { id: 's3', name: 'Remediation Actions', status: 'incomplete', required: true },
      { id: 's4', name: 'Future Outlook', status: 'incomplete', required: false }
    ],
    attachments: []
  }
];

const mockSubmissions: SubmissionHistory[] = [
  {
    id: 'sub-1',
    reportId: 'report-1',
    reportName: 'Daily Trading Activity Report',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    submittedBy: 'Compliance Officer',
    regulator: 'SEC',
    status: 'accepted',
    feedback: 'Report accepted. All requirements met.'
  },
  {
    id: 'sub-2',
    reportId: 'report-2',
    reportName: 'Monthly Risk Assessment',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    submittedBy: 'Risk Manager',
    regulator: 'FINRA',
    status: 'pending',
    feedback: undefined
  }
];

const generateReportingTrend = () => {
  const data = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    data.push({
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      submitted: Math.floor(Math.random() * 20) + 30,
      onTime: Math.floor(Math.random() * 15) + 25,
      late: Math.floor(Math.random() * 5) + 2
    });
  }
  return data;
};

const statusColors = {
  draft: '#6b7280',
  pending_review: '#f59e0b',
  approved: '#10b981',
  submitted: '#3b82f6',
  overdue: '#ef4444'
};

export function RegulatoryReporting() {
  const [ws, setWs] = useState<TradingWebSocketClient | null>(null);
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [submissions, setSubmissions] = useState<SubmissionHistory[]>(mockSubmissions);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedRegulator, setSelectedRegulator] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [trendData] = useState(generateReportingTrend());
  const [date, setDate] = useState<Date | undefined>(new Date());

  const performanceMetrics = usePerformanceMonitor('RegulatoryReporting');

  useEffect(() => {
    const wsClient = TradingWebSocketClient.getInstance('ws://localhost:8000/ws');
    setWs(wsClient);

    // Subscribe to reporting updates
    wsClient.subscribe('reporting.update', (data: any) => {
      if (data.report) {
        setReports(prev => prev.map(r => r.id === data.report.id ? data.report : r));
      }
      if (data.submission) {
        setSubmissions(prev => [data.submission, ...prev]);
      }
    });

    return () => {
      wsClient.unsubscribe('reporting.update');
    };
  }, []);

  const filteredReports = reports.filter(report => {
    if (selectedRegulator !== 'all' && report.regulator !== selectedRegulator) return false;
    if (selectedStatus !== 'all' && report.status !== selectedStatus) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    return (
      <Badge 
        variant="outline"
        style={{ 
          borderColor: statusColors[status as keyof typeof statusColors],
          color: statusColors[status as keyof typeof statusColors]
        }}
      >
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const reportStats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending_review').length,
    overdue: reports.filter(r => r.status === 'overdue').length,
    submitted: submissions.filter(s => s.status === 'accepted').length
  };

  const regulatorDistribution = [
    { name: 'SEC', value: reports.filter(r => r.regulator === 'SEC').length, color: '#3b82f6' },
    { name: 'FINRA', value: reports.filter(r => r.regulator === 'FINRA').length, color: '#10b981' },
    { name: 'CFTC', value: reports.filter(r => r.regulator === 'CFTC').length, color: '#f59e0b' },
    { name: 'Other', value: 2, color: '#8b5cf6' }
  ];

  return (
    <PremiumThemeProvider>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-500" />
              Regulatory Reporting
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage and track regulatory reports and submissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedRegulator} onValueChange={setSelectedRegulator}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Regulator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regulators</SelectItem>
                <SelectItem value="SEC">SEC</SelectItem>
                <SelectItem value="FINRA">FINRA</SelectItem>
                <SelectItem value="CFTC">CFTC</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Reports</p>
                  <p className="text-2xl font-bold">{reportStats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-yellow-500">{reportStats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-500">{reportStats.overdue}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="text-2xl font-bold text-green-500">{reportStats.submitted}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Tabs defaultValue="reports" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="reports">Active Reports</TabsTrigger>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="reports" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {filteredReports.map((report) => (
                      <Card 
                        key={report.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedReport?.id === report.id ? 'border-primary' : ''
                        }`}
                        onClick={() => setSelectedReport(report)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{report.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary">{report.regulator}</Badge>
                                <Badge variant="outline">{report.type}</Badge>
                                {getStatusBadge(report.status)}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Due Date</p>
                              <p className="text-sm font-medium">
                                {report.dueDate.toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progress</span>
                              <span>{report.progress}%</span>
                            </div>
                            <Progress value={report.progress} />
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-3">
                            {report.sections.map((section) => (
                              <div key={section.id} className="flex items-center gap-2">
                                {section.status === 'complete' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : section.status === 'in_progress' ? (
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm">{section.name}</span>
                              </div>
                            ))}
                          </div>

                          {report.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm text-muted-foreground">
                                {report.attachments.length} attachment(s)
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="submissions" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {submissions.map((submission) => (
                      <Card key={submission.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">{submission.reportName}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{submission.regulator}</Badge>
                                <Badge 
                                  variant={submission.status === 'accepted' ? 'default' : 'outline'}
                                  className={
                                    submission.status === 'rejected' ? 'text-red-500' : ''
                                  }
                                >
                                  {submission.status.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Submitted by {submission.submittedBy} on{' '}
                                {submission.submittedAt.toLocaleString()}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                          {submission.feedback && (
                            <div className="mt-3 p-3 bg-muted rounded">
                              <p className="text-sm font-medium">Feedback:</p>
                              <p className="text-sm mt-1">{submission.feedback}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Submission Trends</CardTitle>
                    <CardDescription>12-month reporting submission history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="submitted" stackId="a" fill="#3b82f6" name="Submitted" />
                          <Bar dataKey="onTime" stackId="a" fill="#10b981" name="On Time" />
                          <Bar dataKey="late" stackId="a" fill="#ef4444" name="Late" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Reports by Regulator</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={regulatorDistribution}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label
                            >
                              {regulatorDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
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
                      <CardTitle>Compliance Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">On-Time Submission</span>
                            <span className="text-sm font-medium">92%</span>
                          </div>
                          <Progress value={92} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Acceptance Rate</span>
                            <span className="text-sm font-medium">96%</span>
                          </div>
                          <Progress value={96} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Automation Level</span>
                            <span className="text-sm font-medium">78%</span>
                          </div>
                          <Progress value={78} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reporting Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {selectedReport && (
              <Card>
                <CardHeader>
                  <CardTitle>Report Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Report Name</p>
                    <p className="font-medium">{selectedReport.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Frequency</p>
                    <p className="font-medium">{selectedReport.frequency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Due</p>
                    <p className="font-medium">
                      {selectedReport.nextDue.toLocaleDateString()}
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Actions</p>
                    <Button className="w-full" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Attachment
                    </Button>
                    <Button className="w-full" size="sm" variant="outline">
                      <Send className="h-4 w-4 mr-2" />
                      Submit Report
                    </Button>
                    <Button className="w-full" size="sm" variant="outline">
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Reports This Month</span>
                  <span className="text-sm font-bold">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Automated Reports</span>
                  <span className="text-sm font-bold">8/12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg Completion Time</span>
                  <span className="text-sm font-bold">3.2 days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Rejection Rate</span>
                  <span className="text-sm font-bold text-green-500">2%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PremiumThemeProvider>
  );
}