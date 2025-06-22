'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface OrderTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'strategy' | 'quick_trade' | 'risk_management' | 'custom';
  
  // Order parameters
  symbol?: string;
  side?: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit' | 'bracket' | 'oco' | 'trailing_stop';
  quantityType: 'fixed' | 'percentage' | 'risk_based';
  quantity?: number;
  percentage?: number; // Portfolio percentage
  riskAmount?: number; // Risk-based sizing
  
  // Price parameters
  priceType: 'market' | 'custom' | 'bid' | 'ask' | 'mid' | 'offset';
  price?: number;
  priceOffset?: number; // Offset from market price
  priceOffsetType?: 'absolute' | 'percentage';
  
  // Stop and limit parameters
  stopPrice?: number;
  stopPriceType?: 'custom' | 'offset';
  stopPriceOffset?: number;
  takeProfitPrice?: number;
  takeProfitPriceType?: 'custom' | 'offset';
  takeProfitPriceOffset?: number;
  
  // Advanced options
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  reduceOnly: boolean;
  postOnly: boolean;
  iceberg: boolean;
  icebergQuantity?: number;
  
  // Risk management
  maxSlippage?: number;
  positionLimit?: number; // Max position size
  
  // Metadata
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  lastUsed?: Date;
}

interface OrderTemplateProps {
  templates?: OrderTemplate[];
  currentSymbol?: string;
  portfolioValue?: number;
  availableBuyingPower?: number;
  onTemplateUse?: (template: OrderTemplate, overrides?: Partial<OrderTemplate>) => Promise<void>;
  onTemplateSave?: (template: Omit<OrderTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => Promise<void>;
  onTemplateUpdate?: (template: OrderTemplate) => Promise<void>;
  onTemplateDelete?: (templateId: string) => Promise<void>;
  className?: string;
}

const TEMPLATE_CATEGORIES = [
  { value: 'strategy', label: 'Strategy Templates', description: 'Pre-configured strategy orders' },
  { value: 'quick_trade', label: 'Quick Trade', description: 'Fast execution templates' },
  { value: 'risk_management', label: 'Risk Management', description: 'Risk-controlled orders' },
  { value: 'custom', label: 'Custom', description: 'User-created templates' },
];

const DEFAULT_TEMPLATES: Omit<OrderTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
  {
    name: 'Quick Market Buy',
    description: 'Market buy with 1% portfolio allocation',
    category: 'quick_trade',
    orderType: 'market',
    side: 'buy',
    quantityType: 'percentage',
    percentage: 1,
    priceType: 'market',
    timeInForce: 'ioc',
    reduceOnly: false,
    postOnly: false,
    iceberg: false,
    tags: ['quick', 'market', 'buy'],
    isActive: true,
    lastUsed: undefined,
  },
  {
    name: 'Conservative Long Entry',
    description: 'Bracket order with tight risk management',
    category: 'risk_management',
    orderType: 'bracket',
    side: 'buy',
    quantityType: 'risk_based',
    riskAmount: 100,
    priceType: 'bid',
    priceOffset: 0.1,
    priceOffsetType: 'percentage',
    takeProfitPriceType: 'offset',
    takeProfitPriceOffset: 2,
    stopPriceType: 'offset',
    stopPriceOffset: -1,
    timeInForce: 'gtc',
    reduceOnly: false,
    postOnly: true,
    iceberg: false,
    maxSlippage: 0.1,
    tags: ['conservative', 'bracket', 'risk-managed'],
    isActive: true,
    lastUsed: undefined,
  },
  {
    name: 'Momentum Breakout',
    description: 'Stop order above resistance with trailing stop',
    category: 'strategy',
    orderType: 'stop',
    side: 'buy',
    quantityType: 'percentage',
    percentage: 2,
    priceType: 'offset',
    priceOffset: 0.5,
    priceOffsetType: 'percentage',
    timeInForce: 'gtc',
    reduceOnly: false,
    postOnly: false,
    iceberg: false,
    tags: ['momentum', 'breakout', 'stop'],
    isActive: true,
    lastUsed: undefined,
  },
];

export function OrderTemplate({
  templates = [],
  currentSymbol = 'BTCUSD',
  portfolioValue = 100000,
  availableBuyingPower = 50000,
  onTemplateUse,
  onTemplateSave,
  onTemplateUpdate,
  onTemplateDelete,
  className,
}: OrderTemplateProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'OrderTemplate',
  });

  const [allTemplates, setAllTemplates] = useState<OrderTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OrderTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<OrderTemplate>>({
    name: '',
    description: '',
    category: 'custom',
    orderType: 'market',
    quantityType: 'fixed',
    priceType: 'market',
    timeInForce: 'gtc',
    reduceOnly: false,
    postOnly: false,
    iceberg: false,
    tags: [],
    isActive: true,
  });

  // Initialize templates
  useEffect(() => {
    const savedTemplates = localStorage.getItem('order-templates');
    let userTemplates: OrderTemplate[] = [];
    
    if (savedTemplates) {
      try {
        userTemplates = JSON.parse(savedTemplates);
      } catch (e) {
        console.warn('Failed to parse saved templates:', e);
      }
    }

    // Merge with default templates if no user templates exist
    if (userTemplates.length === 0) {
      const defaultWithIds = DEFAULT_TEMPLATES.map((template, index) => ({
        ...template,
        id: `default_${index}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      }));
      setAllTemplates([...defaultWithIds, ...templates]);
      localStorage.setItem('order-templates', JSON.stringify(defaultWithIds));
    } else {
      setAllTemplates([...userTemplates, ...templates]);
    }
  }, [templates]);

  // Performance monitoring
  useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Save templates to localStorage
  const saveTemplates = (updatedTemplates: OrderTemplate[]) => {
    const userTemplates = updatedTemplates.filter(t => !t.id.startsWith('default_'));
    localStorage.setItem('order-templates', JSON.stringify(userTemplates));
    setAllTemplates(updatedTemplates);
  };

  // Filter templates
  const filteredTemplates = allTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch && template.isActive;
  }).sort((a, b) => {
    // Sort by usage count and last used
    if (a.usageCount !== b.usageCount) {
      return b.usageCount - a.usageCount;
    }
    if (a.lastUsed && b.lastUsed) {
      return b.lastUsed.getTime() - a.lastUsed.getTime();
    }
    return a.name.localeCompare(b.name);
  });

  // Handle template usage
  const handleUseTemplate = async (template: OrderTemplate) => {
    try {
      // Update usage statistics
      const updatedTemplate = {
        ...template,
        usageCount: template.usageCount + 1,
        lastUsed: new Date(),
        updatedAt: new Date(),
      };

      const updatedTemplates = allTemplates.map(t => 
        t.id === template.id ? updatedTemplate : t
      );
      saveTemplates(updatedTemplates);

      // Execute template
      if (onTemplateUse) {
        await onTemplateUse(updatedTemplate, { symbol: currentSymbol });
      }
    } catch (error) {
      console.error('Failed to use template:', error);
    }
  };

  // Handle template creation
  const handleCreateTemplate = async () => {
    if (!newTemplate.name) return;

    try {
      const template: OrderTemplate = {
        id: `custom_${Date.now()}`,
        ...newTemplate as OrderTemplate,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      if (onTemplateSave) {
        await onTemplateSave(newTemplate as any);
      }

      const updatedTemplates = [...allTemplates, template];
      saveTemplates(updatedTemplates);
      
      setNewTemplate({
        name: '',
        description: '',
        category: 'custom',
        orderType: 'market',
        quantityType: 'fixed',
        priceType: 'market',
        timeInForce: 'gtc',
        reduceOnly: false,
        postOnly: false,
        iceberg: false,
        tags: [],
        isActive: true,
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  // Handle template deletion
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      if (onTemplateDelete) {
        await onTemplateDelete(templateId);
      }

      const updatedTemplates = allTemplates.filter(t => t.id !== templateId);
      saveTemplates(updatedTemplates);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  // Calculate template preview
  const getTemplatePreview = (template: OrderTemplate) => {
    let preview = `${template.orderType.toUpperCase()}`;
    
    if (template.side) {
      preview += ` ${template.side.toUpperCase()}`;
    }

    if (template.quantityType === 'percentage' && template.percentage) {
      preview += ` ${template.percentage}% portfolio`;
    } else if (template.quantityType === 'risk_based' && template.riskAmount) {
      preview += ` $${template.riskAmount} risk`;
    } else if (template.quantity) {
      preview += ` ${template.quantity}`;
    }

    if (template.priceType === 'offset' && template.priceOffset) {
      preview += ` @ ${template.priceOffset > 0 ? '+' : ''}${template.priceOffset}${template.priceOffsetType === 'percentage' ? '%' : '$'}`;
    }

    return preview;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Order Templates</span>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm">New Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Order Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={newTemplate.name || ''}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter template name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={newTemplate.category} 
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTemplate.description || ''}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this template"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="orderType">Order Type</Label>
                    <Select 
                      value={newTemplate.orderType} 
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, orderType: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market">Market</SelectItem>
                        <SelectItem value="limit">Limit</SelectItem>
                        <SelectItem value="stop">Stop</SelectItem>
                        <SelectItem value="bracket">Bracket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="side">Side (Optional)</Label>
                    <Select 
                      value={newTemplate.side || ''} 
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, side: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantityType">Quantity Type</Label>
                    <Select 
                      value={newTemplate.quantityType} 
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, quantityType: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="percentage">Portfolio %</SelectItem>
                        <SelectItem value="risk_based">Risk Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button onClick={handleCreateTemplate} disabled={!newTemplate.name}>
                    Create Template
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-48"
          />
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TEMPLATE_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="relative group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M6 3a1 1 0 100-2 1 1 0 000 2zM6 7a1 1 0 100-2 1 1 0 000 2zM6 11a1 1 0 100-2 1 1 0 000 2z" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {/* Template Preview */}
                <div className="text-xs font-mono bg-muted/50 p-2 rounded">
                  {getTemplatePreview(template)}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                  {template.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.tags.length - 2}
                    </Badge>
                  )}
                </div>

                {/* Usage Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Used {template.usageCount} times</span>
                  {template.lastUsed && (
                    <span>{template.lastUsed.toLocaleDateString()}</span>
                  )}
                </div>

                {/* Use Button */}
                <Button
                  onClick={() => handleUseTemplate(template)}
                  size="sm"
                  className="w-full"
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No templates found matching your criteria.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="mt-2"
            >
              Create Your First Template
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}