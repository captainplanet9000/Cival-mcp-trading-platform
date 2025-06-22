'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EnhancedButton, TradingAction } from './EnhancedButton'
import { useAppStore } from '@/lib/stores/app-store'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { backendApi } from '@/lib/api/backend-client'
import { cn } from '@/lib/utils'
import { 
  DollarSign, 
  Percent, 
  Calculator,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Settings
} from 'lucide-react'

export interface TradingButtonGroupProps {
  symbol?: string
  currentPrice?: number
  portfolioBalance?: number
  position?: {
    quantity: number
    avgPrice: number
    unrealizedPnl: number
  }
  className?: string
  onActionExecuted?: (action: TradingAction, result: any) => void
}

export interface QuickTradeSettings {
  quantity: number
  orderType: 'market' | 'limit' | 'stop'
  price?: number
  stopPrice?: number
  timeInForce: 'GTC' | 'IOC' | 'FOK'
  riskManagement: {
    stopLoss?: number
    takeProfit?: number
    maxRisk?: number // percentage of portfolio
  }
}

export function TradingButtonGroup({
  symbol = 'BTCUSDT',
  currentPrice = 45000,
  portfolioBalance = 10000,
  position,
  className,
  onActionExecuted
}: TradingButtonGroupProps) {
  const { publishEvent } = useAGUIProtocol()
  const [settings, setSettings] = useState<QuickTradeSettings>({
    quantity: 0.001,
    orderType: 'market',
    timeInForce: 'GTC',
    riskManagement: {
      maxRisk: 2
    }
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [estimatedFee, setEstimatedFee] = useState(0)

  // Calculate estimated cost and fees
  useEffect(() => {
    const price = settings.orderType === 'market' ? currentPrice : (settings.price || currentPrice)
    const cost = settings.quantity * price
    const fee = cost * 0.001 // 0.1% trading fee
    
    setEstimatedCost(cost)
    setEstimatedFee(fee)
  }, [settings.quantity, settings.price, settings.orderType, currentPrice])

  // Quick percentage buttons for position sizing
  const quickPercentages = [10, 25, 50, 75, 100]

  const handleQuickSize = (percentage: number) => {
    const maxCost = (portfolioBalance * (settings.riskManagement.maxRisk || 2)) / 100
    const price = settings.orderType === 'market' ? currentPrice : (settings.price || currentPrice)
    const quantity = (maxCost * percentage / 100) / price
    
    setSettings(prev => ({ ...prev, quantity }))
  }

  const createTradingAction = (type: 'buy' | 'sell'): TradingAction => {
    const price = settings.orderType === 'market' ? currentPrice : (settings.price || currentPrice)
    const portfolioImpact = (estimatedCost / portfolioBalance) * 100
    
    return {
      id: `${type}-${symbol}-${Date.now()}`,
      type,
      symbol,
      quantity: settings.quantity,
      price: settings.orderType !== 'market' ? price : undefined,
      stopPrice: settings.stopPrice,
      description: `${type.toUpperCase()} ${settings.quantity} ${symbol} ${settings.orderType === 'market' ? 'at market' : `at $${price}`}`,
      riskLevel: portfolioImpact > 5 ? 'high' : portfolioImpact > 2 ? 'medium' : 'low',
      confirmationRequired: portfolioImpact > 1 || settings.orderType !== 'market',
      estimatedImpact: {
        portfolioPercent: portfolioImpact,
        feeEstimate: estimatedFee,
        slippage: settings.orderType === 'market' ? 0.1 : 0
      }
    }
  }

  const createStopLossAction = (): TradingAction => {
    if (!position || !settings.riskManagement.stopLoss) {
      throw new Error('No position or stop loss price set')
    }
    
    return {
      id: `stop-loss-${symbol}-${Date.now()}`,
      type: 'stop_loss',
      symbol,
      quantity: position.quantity,
      stopPrice: settings.riskManagement.stopLoss,
      description: `Set stop loss at $${settings.riskManagement.stopLoss} for ${position.quantity} ${symbol}`,
      riskLevel: 'medium',
      confirmationRequired: true,
      estimatedImpact: {
        portfolioPercent: Math.abs(position.unrealizedPnl / portfolioBalance) * 100,
        feeEstimate: estimatedFee,
        slippage: 0
      }
    }
  }

  const createTakeProfitAction = (): TradingAction => {
    if (!position || !settings.riskManagement.takeProfit) {
      throw new Error('No position or take profit price set')
    }
    
    return {
      id: `take-profit-${symbol}-${Date.now()}`,
      type: 'take_profit',
      symbol,
      quantity: position.quantity,
      price: settings.riskManagement.takeProfit,
      description: `Set take profit at $${settings.riskManagement.takeProfit} for ${position.quantity} ${symbol}`,
      riskLevel: 'low',
      confirmationRequired: false,
      estimatedImpact: {
        portfolioPercent: Math.abs(position.unrealizedPnl / portfolioBalance) * 100,
        feeEstimate: estimatedFee,
        slippage: 0
      }
    }
  }

  const handleActionExecute = async (action: TradingAction) => {
    try {
      // Simulate API call to backend
      const response = await backendApi.createOrder({
        symbol: action.symbol,
        side: action.type === 'buy' ? 'BUY' : 'SELL',
        type: settings.orderType.toUpperCase(),
        quantity: action.quantity,
        price: action.price,
        stopPrice: action.stopPrice,
        timeInForce: settings.timeInForce
      })
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      publishEvent('trading.order_placed', {
        orderId: response.data?.id,
        symbol: action.symbol,
        type: action.type,
        quantity: action.quantity,
        price: action.price
      })
      
      onActionExecuted?.(action, response.data)
      
    } catch (error) {
      publishEvent('trading.order_failed', {
        symbol: action.symbol,
        type: action.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Quick Trade - {symbol}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">${currentPrice.toLocaleString()}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Order Type and Basic Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Order Type</Label>
            <Select
              value={settings.orderType}
              onValueChange={(value) => setSettings(prev => ({ ...prev, orderType: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="stop">Stop</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              step="0.001"
              value={settings.quantity}
              onChange={(e) => setSettings(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>
        
        {/* Quick Size Buttons */}
        <div className="space-y-2">
          <Label>Quick Size (% of max risk)</Label>
          <div className="flex gap-2">
            {quickPercentages.map(pct => (
              <Button
                key={pct}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSize(pct)}
              >
                {pct}%
              </Button>
            ))}
          </div>
        </div>
        
        {/* Limit/Stop Price */}
        {settings.orderType !== 'market' && (
          <div className="space-y-2">
            <Label>{settings.orderType === 'limit' ? 'Limit Price' : 'Stop Price'}</Label>
            <Input
              type="number"
              step="0.01"
              value={settings.price || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, price: parseFloat(e.target.value) || undefined }))}
              placeholder={`Current: $${currentPrice}`}
            />
          </div>
        )}
        
        {/* Estimated Cost */}
        <div className="p-3 bg-muted rounded-lg space-y-1">
          <div className="flex justify-between text-sm">
            <span>Estimated Cost:</span>
            <span className="font-mono">${estimatedCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Est. Fee:</span>
            <span className="font-mono">${estimatedFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Portfolio Impact:</span>
            <span className="font-mono">{((estimatedCost / portfolioBalance) * 100).toFixed(2)}%</span>
          </div>
        </div>
        
        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold">Risk Management</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stop Loss</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.riskManagement.stopLoss || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    riskManagement: {
                      ...prev.riskManagement,
                      stopLoss: parseFloat(e.target.value) || undefined
                    }
                  }))}
                  placeholder="Stop loss price"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Take Profit</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.riskManagement.takeProfit || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    riskManagement: {
                      ...prev.riskManagement,
                      takeProfit: parseFloat(e.target.value) || undefined
                    }
                  }))}
                  placeholder="Take profit price"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Max Risk (% of portfolio)</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.riskManagement.maxRisk || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  riskManagement: {
                    ...prev.riskManagement,
                    maxRisk: parseFloat(e.target.value) || undefined
                  }
                }))}
              />
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Buy/Sell Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <EnhancedButton
              action={createTradingAction('buy')}
              variant="default"
              showConfirmation={true}
              showProgress={true}
              showRiskIndicator={true}
              onExecute={handleActionExecute}
            />
            <EnhancedButton
              action={createTradingAction('sell')}
              variant="destructive"
              showConfirmation={true}
              showProgress={true}
              showRiskIndicator={true}
              onExecute={handleActionExecute}
            />
          </div>
          
          {/* Position Management Buttons (only if position exists) */}
          {position && (
            <div className="space-y-2">
              <Label>Position Management</Label>
              <div className="grid grid-cols-2 gap-4">
                {settings.riskManagement.stopLoss && (
                  <EnhancedButton
                    action={createStopLossAction()}
                    variant="outline"
                    size="sm"
                    showConfirmation={true}
                    onExecute={handleActionExecute}
                  />
                )}
                {settings.riskManagement.takeProfit && (
                  <EnhancedButton
                    action={createTakeProfitAction()}
                    variant="outline"
                    size="sm"
                    showConfirmation={false}
                    onExecute={handleActionExecute}
                  />
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Current Position Info */}
        {position && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Current Position</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Quantity:</span>
                <div className="font-mono">{position.quantity}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Price:</span>
                <div className="font-mono">${position.avgPrice.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">P&L:</span>
                <div className={cn(
                  "font-mono",
                  position.unrealizedPnl >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  ${position.unrealizedPnl.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}