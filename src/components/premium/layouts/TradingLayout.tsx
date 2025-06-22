'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { usePremiumTheme } from '../core/PremiumThemeProvider';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface PanelConfig {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  props?: any;
  width?: number; // percentage
  height?: number; // percentage
  minWidth?: number; // pixels
  minHeight?: number; // pixels
  maxWidth?: number; // pixels
  maxHeight?: number; // pixels
  resizable?: boolean;
  closable?: boolean;
  collapsed?: boolean;
  position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  zIndex?: number;
}

interface LayoutState {
  panels: PanelConfig[];
  fullscreenPanel?: string;
  sidebarCollapsed: boolean;
  headerVisible: boolean;
  footerVisible: boolean;
}

interface TradingLayoutProps {
  children?: React.ReactNode;
  initialPanels?: PanelConfig[];
  enableResize?: boolean;
  enablePersistence?: boolean;
  layoutId?: string;
  className?: string;
  onLayoutChange?: (layout: LayoutState) => void;
}

export function TradingLayout({
  children,
  initialPanels = [],
  enableResize = true,
  enablePersistence = true,
  layoutId = 'default',
  className,
  onLayoutChange,
}: TradingLayoutProps) {
  const { theme } = usePremiumTheme();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor({
    componentName: 'TradingLayout',
  });

  const [layoutState, setLayoutState] = useState<LayoutState>(() => {
    // Load saved layout if persistence is enabled
    if (enablePersistence && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`trading-layout-${layoutId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.warn('Failed to parse saved layout:', e);
        }
      }
    }
    
    return {
      panels: initialPanels,
      sidebarCollapsed: false,
      headerVisible: true,
      footerVisible: true,
    };
  });

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    panelId?: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  const layoutRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver>();

  // Save layout to localStorage
  const saveLayout = useCallback((state: LayoutState) => {
    if (enablePersistence && typeof window !== 'undefined') {
      localStorage.setItem(`trading-layout-${layoutId}`, JSON.stringify(state));
    }
    onLayoutChange?.(state);
  }, [enablePersistence, layoutId, onLayoutChange]);

  // Update layout state
  const updateLayout = useCallback((updates: Partial<LayoutState>) => {
    setLayoutState(prev => {
      const newState = { ...prev, ...updates };
      saveLayout(newState);
      return newState;
    });
  }, [saveLayout]);

  // Panel management
  const addPanel = useCallback((panel: PanelConfig) => {
    updateLayout({
      panels: [...layoutState.panels, panel],
    });
  }, [layoutState.panels, updateLayout]);

  const removePanel = useCallback((panelId: string) => {
    updateLayout({
      panels: layoutState.panels.filter(p => p.id !== panelId),
      fullscreenPanel: layoutState.fullscreenPanel === panelId ? undefined : layoutState.fullscreenPanel,
    });
  }, [layoutState.panels, layoutState.fullscreenPanel, updateLayout]);

  const updatePanel = useCallback((panelId: string, updates: Partial<PanelConfig>) => {
    updateLayout({
      panels: layoutState.panels.map(p => 
        p.id === panelId ? { ...p, ...updates } : p
      ),
    });
  }, [layoutState.panels, updateLayout]);

  const togglePanelCollapse = useCallback((panelId: string) => {
    updatePanel(panelId, { 
      collapsed: !layoutState.panels.find(p => p.id === panelId)?.collapsed 
    });
  }, [layoutState.panels, updatePanel]);

  const toggleFullscreen = useCallback((panelId?: string) => {
    updateLayout({
      fullscreenPanel: layoutState.fullscreenPanel === panelId ? undefined : panelId,
    });
  }, [layoutState.fullscreenPanel, updateLayout]);

  // Resize functionality
  const handleResizeStart = useCallback((e: React.MouseEvent, panelId: string) => {
    if (!enableResize) return;
    
    e.preventDefault();
    const panel = layoutState.panels.find(p => p.id === panelId);
    if (!panel) return;

    setDragState({
      isDragging: true,
      panelId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: panel.width || 50,
      startHeight: panel.height || 50,
    });
  }, [enableResize, layoutState.panels]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.panelId) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    if (layoutRef.current) {
      const rect = layoutRef.current.getBoundingClientRect();
      const newWidth = Math.max(10, Math.min(90, 
        dragState.startWidth + (deltaX / rect.width) * 100
      ));
      const newHeight = Math.max(10, Math.min(90, 
        dragState.startHeight + (deltaY / rect.height) * 100
      ));

      updatePanel(dragState.panelId, { width: newWidth, height: newHeight });
    }
  }, [dragState, updatePanel]);

  const handleResizeEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
    });
  }, []);

  // Mouse event handlers
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [dragState.isDragging, handleResizeMove, handleResizeEnd]);

  // Performance monitoring
  useEffect(() => {
    startMeasurement();
    return () => endMeasurement();
  });

  // Responsive layout adjustments
  useEffect(() => {
    if (!layoutRef.current) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width } = entry.contentRect;
      
      // Auto-collapse sidebar on mobile
      if (width < 768 && !layoutState.sidebarCollapsed) {
        updateLayout({ sidebarCollapsed: true });
      } else if (width >= 768 && layoutState.sidebarCollapsed) {
        updateLayout({ sidebarCollapsed: false });
      }
    });

    resizeObserverRef.current.observe(layoutRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [layoutState.sidebarCollapsed, updateLayout]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            toggleFullscreen(layoutState.fullscreenPanel);
            break;
          case 'b':
            e.preventDefault();
            updateLayout({ sidebarCollapsed: !layoutState.sidebarCollapsed });
            break;
          case 'h':
            e.preventDefault();
            updateLayout({ headerVisible: !layoutState.headerVisible });
            break;
        }
      } else if (e.key === 'Escape' && layoutState.fullscreenPanel) {
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [layoutState, updateLayout, toggleFullscreen]);

  // Render panel component
  const renderPanel = useCallback((panel: PanelConfig) => {
    const Component = panel.component;
    const isFullscreen = layoutState.fullscreenPanel === panel.id;
    const isCollapsed = panel.collapsed;

    return (
      <div
        key={panel.id}
        className={cn(
          'relative bg-background border border-border rounded-lg overflow-hidden',
          'transition-all duration-300 ease-in-out',
          isFullscreen && 'fixed inset-4 z-50 shadow-2xl',
          isCollapsed && 'h-12',
          dragState.isDragging && dragState.panelId === panel.id && 'pointer-events-none',
          className
        )}
        style={{
          width: isFullscreen ? 'auto' : `${panel.width || 50}%`,
          height: isFullscreen ? 'auto' : (isCollapsed ? '48px' : `${panel.height || 50}%`),
          minWidth: panel.minWidth,
          minHeight: isCollapsed ? 48 : panel.minHeight,
          maxWidth: panel.maxWidth,
          maxHeight: panel.maxHeight,
          backgroundColor: theme.colors.panelBackground,
          borderColor: theme.colors.panelBorder,
        }}
      >
        {/* Panel Header */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50"
          style={{ borderBottomColor: theme.colors.panelBorder }}
        >
          <h3 className="text-sm font-medium text-foreground">{panel.title}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => togglePanelCollapse(panel.id)}
              className="p-1 hover:bg-muted rounded transition-colors"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                <path d={isCollapsed ? 'M3 5l3 3 3-3' : 'M9 7l-3-3-3 3'} />
              </svg>
            </button>
            
            <button
              onClick={() => toggleFullscreen(panel.id)}
              className="p-1 hover:bg-muted rounded transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                <path d={isFullscreen 
                  ? 'M4 8v1h1v1H3V8h1zM8 8v2H6V9h1V8h1zM4 4V3h2v1H5v1H4zM8 4V3H6v1h1v1h1z'
                  : 'M2 2v2h1V3h1V2H2zM8 2v1h1v1h1V2H8zM2 8v2h2V9H3V8H2zM10 8v1H9v1h2V8h-1z'
                } />
              </svg>
            </button>

            {panel.closable && (
              <button
                onClick={() => removePanel(panel.id)}
                className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
                title="Close"
              >
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M9.5 3.5L8.5 2.5 6 5 3.5 2.5 2.5 3.5 5 6 2.5 8.5 3.5 9.5 6 7 8.5 9.5 9.5 8.5 7 6z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Panel Content */}
        {!isCollapsed && (
          <div className="flex-1 overflow-hidden">
            <Component {...panel.props} />
          </div>
        )}

        {/* Resize Handle */}
        {enableResize && !isFullscreen && !isCollapsed && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeStart(e, panel.id)}
          >
            <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-muted-foreground" />
          </div>
        )}
      </div>
    );
  }, [
    layoutState.fullscreenPanel,
    dragState,
    theme,
    className,
    enableResize,
    togglePanelCollapse,
    toggleFullscreen,
    removePanel,
    handleResizeStart,
  ]);

  return (
    <div
      ref={layoutRef}
      className={cn(
        'flex flex-col h-screen overflow-hidden',
        'trading-layout',
        className
      )}
      style={{ backgroundColor: theme.colors.chartBackground }}
    >
      {/* Header */}
      {layoutState.headerVisible && (
        <div
          className="flex-shrink-0 border-b border-border"
          style={{
            backgroundColor: theme.colors.headerBackground,
            borderBottomColor: theme.colors.panelBorder,
          }}
        >
          {/* Header content will be rendered here */}
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-foreground">Trading Dashboard</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateLayout({ sidebarCollapsed: !layoutState.sidebarCollapsed })}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="Toggle Sidebar"
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 12V4h2v8H3zm6-8h4v8H9V4z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!layoutState.sidebarCollapsed && (
          <div
            className="flex-shrink-0 w-64 border-r border-border overflow-y-auto"
            style={{
              backgroundColor: theme.colors.sidebarBackground,
              borderRightColor: theme.colors.panelBorder,
            }}
          >
            {/* Sidebar content will be rendered here */}
            <div className="p-4">
              <h2 className="text-sm font-medium text-muted-foreground mb-4">Navigation</h2>
              {/* Navigation items */}
            </div>
          </div>
        )}

        {/* Panel Area */}
        <div className="flex-1 overflow-hidden">
          {layoutState.fullscreenPanel ? (
            // Fullscreen mode
            <>
              {layoutState.panels
                .filter(p => p.id === layoutState.fullscreenPanel)
                .map(renderPanel)}
            </>
          ) : (
            // Grid layout
            <div className="grid grid-cols-12 grid-rows-12 gap-2 p-2 h-full">
              {layoutState.panels.map(renderPanel)}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {layoutState.footerVisible && (
        <div
          className="flex-shrink-0 border-t border-border px-4 py-2"
          style={{
            backgroundColor: theme.colors.headerBackground,
            borderTopColor: theme.colors.panelBorder,
          }}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Trading Session: Active</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* Global overlay for dragging */}
      {dragState.isDragging && (
        <div className="fixed inset-0 z-40 cursor-se-resize" />
      )}

      {children}
    </div>
  );
}

// Export additional utilities
export { type PanelConfig, type LayoutState };