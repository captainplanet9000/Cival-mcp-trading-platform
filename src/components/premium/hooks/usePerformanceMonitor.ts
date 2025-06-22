'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentMounts: number;
  rerenders: number;
  lastRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
}

interface PerformanceAlert {
  type: 'warning' | 'error';
  message: string;
  timestamp: number;
  componentName: string;
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
}

interface PerformanceConfig {
  enableProfiling: boolean;
  renderTimeThreshold: number; // ms
  memoryThreshold: number; // MB
  maxAlerts: number;
  componentName?: string;
}

const defaultConfig: PerformanceConfig = {
  enableProfiling: process.env.NODE_ENV === 'development',
  renderTimeThreshold: 16, // 60fps = 16.67ms per frame
  memoryThreshold: 50, // 50MB
  maxAlerts: 10,
};

export function usePerformanceMonitor(config: Partial<PerformanceConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentMounts: 0,
    rerenders: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
  });
  
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const renderStartRef = useRef<number>(0);
  const renderTimesRef = useRef<number[]>([]);
  const mountTimeRef = useRef<number>(Date.now());
  const rerenderCountRef = useRef(0);

  // Start performance measurement
  const startMeasurement = useCallback(() => {
    if (!finalConfig.enableProfiling) return;
    renderStartRef.current = performance.now();
  }, [finalConfig.enableProfiling]);

  // End performance measurement
  const endMeasurement = useCallback(() => {
    if (!finalConfig.enableProfiling || renderStartRef.current === 0) return;
    
    const renderTime = performance.now() - renderStartRef.current;
    renderTimesRef.current.push(renderTime);
    
    // Keep only last 100 measurements
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current = renderTimesRef.current.slice(-100);
    }
    
    const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
    const maxRenderTime = Math.max(...renderTimesRef.current);
    const minRenderTime = Math.min(...renderTimesRef.current);
    
    setMetrics(prev => ({
      ...prev,
      renderTime,
      lastRenderTime: Date.now(),
      averageRenderTime,
      maxRenderTime,
      minRenderTime,
      rerenders: rerenderCountRef.current,
    }));

    // Check for performance issues
    checkPerformanceThresholds(renderTime, averageRenderTime);
    
    renderStartRef.current = 0;
  }, [finalConfig.enableProfiling]);

  // Check performance thresholds and create alerts
  const checkPerformanceThresholds = useCallback((renderTime: number, averageRenderTime: number) => {
    const now = Date.now();
    const componentName = finalConfig.componentName || 'Unknown Component';
    
    // Check render time threshold
    if (renderTime > finalConfig.renderTimeThreshold) {
      const alert: PerformanceAlert = {
        type: renderTime > finalConfig.renderTimeThreshold * 2 ? 'error' : 'warning',
        message: `Slow render detected: ${renderTime.toFixed(2)}ms (threshold: ${finalConfig.renderTimeThreshold}ms)`,
        timestamp: now,
        componentName,
        metric: 'renderTime',
        value: renderTime,
        threshold: finalConfig.renderTimeThreshold,
      };
      
      setAlerts(prev => [alert, ...prev.slice(0, finalConfig.maxAlerts - 1)]);
    }

    // Check average render time
    if (averageRenderTime > finalConfig.renderTimeThreshold * 0.8) {
      const alert: PerformanceAlert = {
        type: 'warning',
        message: `Consistently slow renders: ${averageRenderTime.toFixed(2)}ms average`,
        timestamp: now,
        componentName,
        metric: 'averageRenderTime',
        value: averageRenderTime,
        threshold: finalConfig.renderTimeThreshold * 0.8,
      };
      
      setAlerts(prev => {
        // Avoid duplicate alerts for the same issue
        const hasRecentSimilarAlert = prev.some(a => 
          a.metric === 'averageRenderTime' && 
          now - a.timestamp < 5000 // 5 seconds
        );
        
        if (hasRecentSimilarAlert) return prev;
        return [alert, ...prev.slice(0, finalConfig.maxAlerts - 1)];
      });
    }
  }, [finalConfig]);

  // Memory monitoring
  const updateMemoryUsage = useCallback(() => {
    if (!finalConfig.enableProfiling) return;
    
    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      
      setMetrics(prev => ({ ...prev, memoryUsage }));
      
      // Check memory threshold
      if (memoryUsage > finalConfig.memoryThreshold) {
        const alert: PerformanceAlert = {
          type: memoryUsage > finalConfig.memoryThreshold * 1.5 ? 'error' : 'warning',
          message: `High memory usage: ${memoryUsage.toFixed(2)}MB (threshold: ${finalConfig.memoryThreshold}MB)`,
          timestamp: Date.now(),
          componentName: finalConfig.componentName || 'Unknown Component',
          metric: 'memoryUsage',
          value: memoryUsage,
          threshold: finalConfig.memoryThreshold,
        };
        
        setAlerts(prev => {
          const hasRecentMemoryAlert = prev.some(a => 
            a.metric === 'memoryUsage' && 
            Date.now() - a.timestamp < 10000 // 10 seconds
          );
          
          if (hasRecentMemoryAlert) return prev;
          return [alert, ...prev.slice(0, finalConfig.maxAlerts - 1)];
        });
      }
    }
  }, [finalConfig]);

  // Component lifecycle tracking
  useEffect(() => {
    setMetrics(prev => ({ ...prev, componentMounts: prev.componentMounts + 1 }));
    
    // Memory monitoring interval
    const memoryInterval = setInterval(updateMemoryUsage, 2000);
    
    return () => {
      clearInterval(memoryInterval);
    };
  }, [updateMemoryUsage]);

  // Track rerenders
  useEffect(() => {
    rerenderCountRef.current++;
  });

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Get performance report
  const getPerformanceReport = useCallback(() => {
    const uptime = Date.now() - mountTimeRef.current;
    const recentAlerts = alerts.filter(a => Date.now() - a.timestamp < 60000); // Last minute
    
    return {
      metrics,
      alerts: recentAlerts,
      uptime,
      isHealthy: recentAlerts.filter(a => a.type === 'error').length === 0,
      recommendations: generateRecommendations(),
    };
  }, [metrics, alerts]);

  // Generate performance recommendations
  const generateRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    
    if (metrics.averageRenderTime > finalConfig.renderTimeThreshold) {
      recommendations.push('Consider using React.memo() or useMemo() to optimize renders');
    }
    
    if (metrics.memoryUsage > finalConfig.memoryThreshold) {
      recommendations.push('Check for memory leaks and unnecessary object references');
    }
    
    if (metrics.rerenders > 100) {
      recommendations.push('High rerender count detected. Review dependency arrays in hooks');
    }
    
    if (renderTimesRef.current.length > 10) {
      const variance = calculateVariance(renderTimesRef.current);
      if (variance > 50) {
        recommendations.push('Inconsistent render times. Consider code splitting or lazy loading');
      }
    }
    
    return recommendations;
  }, [metrics, finalConfig]);

  // Utility function to calculate variance
  const calculateVariance = (numbers: number[]) => {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((acc, num) => acc + Math.pow(num - mean, 2), 0) / numbers.length;
    return variance;
  };

  // Export performance data
  const exportData = useCallback(() => {
    const data = {
      metrics,
      alerts,
      renderTimes: renderTimesRef.current,
      config: finalConfig,
      timestamp: Date.now(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-${finalConfig.componentName || 'component'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, alerts, finalConfig]);

  return {
    // Measurement functions
    startMeasurement,
    endMeasurement,
    
    // Data
    metrics,
    alerts,
    
    // Utilities
    clearAlerts,
    getPerformanceReport,
    exportData,
    
    // Status
    isEnabled: finalConfig.enableProfiling,
    isHealthy: alerts.filter(a => a.type === 'error').length === 0,
  };
}

// HOC for automatic performance monitoring
export function withPerformanceMonitor<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config?: Partial<PerformanceConfig>
) {
  const PerformanceMonitoredComponent = (props: P) => {
    const { startMeasurement, endMeasurement } = usePerformanceMonitor({
      ...config,
      componentName: config?.componentName || WrappedComponent.displayName || WrappedComponent.name,
    });

    useEffect(() => {
      startMeasurement();
      return () => {
        endMeasurement();
      };
    });

    return <WrappedComponent {...props} />;
  };

  PerformanceMonitoredComponent.displayName = `withPerformanceMonitor(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return PerformanceMonitoredComponent;
}

// Performance monitoring context for global monitoring
interface PerformanceContextType {
  globalMetrics: Record<string, PerformanceMetrics>;
  globalAlerts: PerformanceAlert[];
  registerComponent: (name: string, metrics: PerformanceMetrics) => void;
  unregisterComponent: (name: string) => void;
  getOverallHealth: () => boolean;
}

const PerformanceContext = React.createContext<PerformanceContextType | undefined>(undefined);

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [globalMetrics, setGlobalMetrics] = useState<Record<string, PerformanceMetrics>>({});
  const [globalAlerts, setGlobalAlerts] = useState<PerformanceAlert[]>([]);

  const registerComponent = useCallback((name: string, metrics: PerformanceMetrics) => {
    setGlobalMetrics(prev => ({ ...prev, [name]: metrics }));
  }, []);

  const unregisterComponent = useCallback((name: string) => {
    setGlobalMetrics(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  }, []);

  const getOverallHealth = useCallback(() => {
    return globalAlerts.filter(a => a.type === 'error').length === 0;
  }, [globalAlerts]);

  const value: PerformanceContextType = {
    globalMetrics,
    globalAlerts,
    registerComponent,
    unregisterComponent,
    getOverallHealth,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function useGlobalPerformance() {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('useGlobalPerformance must be used within a PerformanceProvider');
  }
  return context;
}

import React, { useContext } from 'react';