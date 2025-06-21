/**
 * Trading Calendar Component
 * Displays daily trading performance in a calendar view
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown,
  Calendar as CalendarIcon,
  DollarSign,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DayData {
  date: Date
  pnl: number
  trades: number
  winRate: number
  volume: number
}

interface TradingCalendarProps {
  onDaySelect?: (date: Date) => void
}

export function TradingCalendar({ onDaySelect }: TradingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [monthData, setMonthData] = useState<Map<string, DayData>>(new Map())

  // Generate mock data for the month
  useEffect(() => {
    const data = new Map<string, DayData>()
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateKey = date.toISOString().split('T')[0]
      
      // Generate mock data (replace with real data from API)
      if (date <= new Date()) { // Only generate data for past dates
        const pnl = (Math.random() - 0.45) * 2000 // Slight positive bias
        const trades = Math.floor(Math.random() * 50) + 10
        const winRate = 40 + Math.random() * 30 // 40-70% win rate
        const volume = Math.floor(Math.random() * 100000) + 10000

        data.set(dateKey, {
          date,
          pnl,
          trades,
          winRate,
          volume
        })
      }
    }

    setMonthData(data)
  }, [currentMonth])

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getDayClass = (pnl: number) => {
    if (pnl > 1000) return 'bg-emerald-100 text-emerald-900 border-emerald-200'
    if (pnl > 0) return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (pnl > -1000) return 'bg-rose-50 text-rose-700 border-rose-100'
    return 'bg-rose-100 text-rose-900 border-rose-200'
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    onDaySelect?.(date)
  }

  const days = getDaysInMonth()
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Calculate monthly statistics
  const monthlyStats = Array.from(monthData.values()).reduce(
    (acc, day) => ({
      totalPnL: acc.totalPnL + day.pnl,
      totalTrades: acc.totalTrades + day.trades,
      winDays: acc.winDays + (day.pnl > 0 ? 1 : 0),
      totalDays: acc.totalDays + 1
    }),
    { totalPnL: 0, totalTrades: 0, winDays: 0, totalDays: 0 }
  )

  const monthlyWinRate = monthlyStats.totalDays > 0 
    ? (monthlyStats.winDays / monthlyStats.totalDays * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Trading Calendar</CardTitle>
              <CardDescription>Track your daily trading performance</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium w-32 text-center">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Monthly Statistics */}
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly P&L</span>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <div className={cn(
                "text-lg font-bold mt-1",
                monthlyStats.totalPnL >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                {formatCurrency(monthlyStats.totalPnL)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Trades</span>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-lg font-bold mt-1">{monthlyStats.totalTrades}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Win Days</span>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-lg font-bold mt-1 text-emerald-600">
                {monthlyStats.winDays}/{monthlyStats.totalDays}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Win Rate</span>
                <CalendarIcon className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-lg font-bold mt-1">{monthlyWinRate}%</div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 bg-gray-50">
              {weekDays.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-600 border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square border-r border-b" />
                }

                const dateKey = date.toISOString().split('T')[0]
                const dayData = monthData.get(dateKey)
                const isToday = date.toDateString() === new Date().toDateString()
                const isSelected = selectedDate?.toDateString() === date.toDateString()
                const isFuture = date > new Date()

                return (
                  <div
                    key={dateKey}
                    onClick={() => !isFuture && dayData && handleDayClick(date)}
                    className={cn(
                      "aspect-square border-r border-b p-1 cursor-pointer transition-all hover:shadow-inner",
                      dayData && getDayClass(dayData.pnl),
                      isToday && "ring-2 ring-violet-500",
                      isSelected && "ring-2 ring-amber-500",
                      isFuture && "bg-gray-50 cursor-not-allowed",
                      !dayData && !isFuture && "bg-white"
                    )}
                  >
                    <div className="h-full flex flex-col">
                      <div className="text-xs font-medium mb-1">{date.getDate()}</div>
                      {dayData && (
                        <div className="flex-1 flex flex-col justify-center space-y-1">
                          <div className={cn(
                            "text-xs font-bold",
                            dayData.pnl >= 0 ? "text-emerald-700" : "text-rose-700"
                          )}>
                            {formatCurrency(dayData.pnl)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {dayData.trades} trades
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-emerald-100 border border-emerald-200 rounded"></div>
              <span className="text-xs text-gray-600">High Profit ($1000+)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-emerald-50 border border-emerald-100 rounded"></div>
              <span className="text-xs text-gray-600">Profit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-rose-50 border border-rose-100 rounded"></div>
              <span className="text-xs text-gray-600">Loss</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-rose-100 border border-rose-200 rounded"></div>
              <span className="text-xs text-gray-600">High Loss ($1000+)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      {selectedDate && monthData.get(selectedDate.toISOString().split('T')[0]) && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const dayData = monthData.get(selectedDate.toISOString().split('T')[0])!
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Day P&L</div>
                    <div className={cn(
                      "text-xl font-bold",
                      dayData.pnl >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {formatCurrency(dayData.pnl)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Trades</div>
                    <div className="text-xl font-bold">{dayData.trades}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Win Rate</div>
                    <div className="text-xl font-bold">{dayData.winRate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Volume</div>
                    <div className="text-xl font-bold">{formatCurrency(dayData.volume)}</div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}