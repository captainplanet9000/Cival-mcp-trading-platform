/**
 * Crypto Charts Component Library
 * Built for Advanced Multi-Agent Trading Platform
 * AG-UI Protocol v2 Integration
 */

// Main components
export { CryptoChart } from './CryptoChart'
export { ChartControls } from './ChartControls'

// Hooks
export { useCryptoChart } from './hooks/useCryptoChart'

// Types and interfaces
export type {
  CryptoChartProps,
  ChartControlsProps,
  CandlestickData,
  VolumeData,
  PriceData,
  ChartType,
  TimeFrame,
  ChartState,
  CrosshairData,
  TechnicalIndicator,
  MovingAverageIndicator,
  RSIIndicator,
  BollingerBandsIndicator,
  MACDIndicator,
  ChartEvents,
  MarketDataResponse,
  TechnicalIndicatorResponse,
  UseCryptoChartOptions,
  ChartDataState,
  UseCryptoChartReturn,
  TradingSymbol,
  SymbolCategory
} from './types'

// Constants
export {
  SYMBOL_CATEGORIES,
  DEFAULT_TIMEFRAMES,
  DEFAULT_CHART_HEIGHT,
  DEFAULT_VOLUME_HEIGHT,
  DEFAULT_REFRESH_INTERVAL,
  DEFAULT_HISTORICAL_PERIOD
} from './types'