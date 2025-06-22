/**
 * TypeScript definitions for Crypto Charts component
 * Enhanced with AG-UI Protocol v2 integration
 */

// Core chart data types
export interface CandlestickData {
  x: number; // timestamp
  y: [number, number, number, number]; // [open, high, low, close]
}

export interface VolumeData {
  x: number; // timestamp
  y: number; // volume
}

export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Chart configuration types
export type ChartType = 'candlestick' | 'area' | 'line';
export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface ChartState {
  activeSymbol: string;
  timeframe: TimeFrame;
  chartType: ChartType;
  indicators: string[];
  volume: boolean;
  crosshairData?: CrosshairData;
}

export interface CrosshairData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  change: number;
  changePercent: number;
}

// Technical indicators
export interface TechnicalIndicator {
  id: string;
  name: string;
  type: 'overlay' | 'oscillator';
  parameters: Record<string, any>;
  color: string;
  visible: boolean;
}

export interface MovingAverageIndicator extends TechnicalIndicator {
  type: 'overlay';
  parameters: {
    period: number;
    type: 'sma' | 'ema' | 'wma';
  };
}

export interface RSIIndicator extends TechnicalIndicator {
  type: 'oscillator';
  parameters: {
    period: number;
    overbought: number;
    oversold: number;
  };
}

export interface BollingerBandsIndicator extends TechnicalIndicator {
  type: 'overlay';
  parameters: {
    period: number;
    standardDeviations: number;
  };
}

export interface MACDIndicator extends TechnicalIndicator {
  type: 'oscillator';
  parameters: {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
  };
}

// Chart events for AG-UI Protocol v2
export interface ChartEvents {
  'chart.symbol_changed': {
    oldSymbol: string;
    newSymbol: string;
    timeframe: TimeFrame;
  };
  
  'chart.timeframe_changed': {
    symbol: string;
    oldTimeframe: TimeFrame;
    newTimeframe: TimeFrame;
  };
  
  'chart.crosshair_move': {
    symbol: string;
    price: number;
    time: number;
    volume?: number;
  };
  
  'chart.indicator_added': {
    symbol: string;
    indicator: TechnicalIndicator;
  };
  
  'chart.indicator_removed': {
    symbol: string;
    indicatorId: string;
  };
  
  'chart.indicator_change': {
    symbol: string;
    indicators: string[];
    timeframe: string;
  };
  
  'chart.data_updated': {
    symbol: string;
    timeframe: TimeFrame;
    dataPoints: number;
    lastPrice?: number;
  };
  
  'chart.data_error': {
    symbol: string;
    error: string;
    usingMockData: boolean;
  };
  
  'chart.zoom_changed': {
    symbol: string;
    zoomLevel: number;
    visibleRange: {
      start: number;
      end: number;
    };
  };
}

// Chart component props
export interface CryptoChartProps {
  symbol?: string;
  height?: number;
  showControls?: boolean;
  showVolume?: boolean;
  showIndicators?: boolean;
  className?: string;
  theme?: 'light' | 'dark';
  onCrosshairMove?: (data: CrosshairData) => void;
  onSymbolChange?: (symbol: string) => void;
  onTimeframeChange?: (timeframe: TimeFrame) => void;
  onIndicatorChange?: (indicators: string[]) => void;
}

export interface ChartControlsProps {
  symbol: string;
  onSymbolChange?: (symbol: string) => void;
  onTimeframeChange?: (timeframe: string) => void;
  onIndicatorChange?: (indicators: string[]) => void;
  onChartTypeChange?: (type: ChartType) => void;
}

// Market data API types
export interface MarketDataResponse {
  symbol: string;
  ohlcv_data: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  indicators?: Record<string, any>;
}

export interface TechnicalIndicatorResponse {
  symbol: string;
  timeframe: TimeFrame;
  indicators: Record<string, {
    type: string;
    data: number[];
    parameters: Record<string, any>;
  }>;
}

// Chart hook types
export interface UseCryptoChartOptions {
  symbol: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  historicalPeriod?: number;
}

export interface ChartDataState {
  candlestickData: CandlestickData[];
  volumeData: VolumeData[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export interface UseCryptoChartReturn extends ChartDataState {
  refetch: () => void;
  addCandleData: (candle: CandlestickData, volume?: VolumeData) => void;
  isRealTime: boolean;
  symbolPair: string;
  timeframe: TimeFrame;
}

// Trading symbol configuration
export interface TradingSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  tickSize: number;
  minQty: number;
  maxQty: number;
  stepSize: number;
  active: boolean;
}

// Popular trading pairs by category
export interface SymbolCategory {
  name: string;
  symbols: TradingSymbol[];
}

export const SYMBOL_CATEGORIES: SymbolCategory[] = [
  {
    name: 'Major Pairs',
    symbols: [
      { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', tickSize: 0.01, minQty: 0.00001, maxQty: 9000, stepSize: 0.00001, active: true },
      { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', tickSize: 0.01, minQty: 0.0001, maxQty: 90000, stepSize: 0.0001, active: true },
      { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', tickSize: 0.01, minQty: 0.001, maxQty: 9000000, stepSize: 0.001, active: true },
    ]
  },
  {
    name: 'DeFi Tokens',
    symbols: [
      { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', tickSize: 0.0001, minQty: 0.1, maxQty: 90000000, stepSize: 0.1, active: true },
      { symbol: 'DOTUSDT', baseAsset: 'DOT', quoteAsset: 'USDT', tickSize: 0.001, minQty: 0.01, maxQty: 9000000, stepSize: 0.01, active: true },
      { symbol: 'LINKUSDT', baseAsset: 'LINK', quoteAsset: 'USDT', tickSize: 0.001, minQty: 0.01, maxQty: 9000000, stepSize: 0.01, active: true },
    ]
  },
  {
    name: 'Layer 1',
    symbols: [
      { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', tickSize: 0.001, minQty: 0.001, maxQty: 9000000, stepSize: 0.001, active: true },
      { symbol: 'AVAXUSDT', baseAsset: 'AVAX', quoteAsset: 'USDT', tickSize: 0.001, minQty: 0.001, maxQty: 9000000, stepSize: 0.001, active: true },
    ]
  },
  {
    name: 'Meme Coins',
    symbols: [
      { symbol: 'DOGEUSDT', baseAsset: 'DOGE', quoteAsset: 'USDT', tickSize: 0.00001, minQty: 1, maxQty: 90000000, stepSize: 1, active: true },
      { symbol: 'SHIBUSDT', baseAsset: 'SHIB', quoteAsset: 'USDT', tickSize: 0.00000001, minQty: 100, maxQty: 90000000000, stepSize: 100, active: true },
    ]
  }
];

// Export commonly used constants
export const DEFAULT_TIMEFRAMES: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
export const DEFAULT_CHART_HEIGHT = 400;
export const DEFAULT_VOLUME_HEIGHT = 100;
export const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds
export const DEFAULT_HISTORICAL_PERIOD = 100; // 100 candles