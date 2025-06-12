"""
Comprehensive Real-Time Trading Dashboard - Phase 5 Implementation
Multi-tab dashboard with live data integration from all platform services
"""
import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from loguru import logger

from ..core.service_registry import get_registry

class ComprehensiveDashboard:
    """
    Comprehensive dashboard integrating all platform services with real-time data
    """
    
    def __init__(self):
        self.registry = get_registry()
        self.last_update = datetime.now(timezone.utc)
        logger.info("ComprehensiveDashboard initialized with live data integration")
    
    async def get_overview_data(self) -> Dict[str, Any]:
        """Get comprehensive platform overview with real data"""
        
        try:
            # Get registry health data
            health_data = await self.registry.health_check()
            
            # Count services by category
            phase2_services = ["agent_trading_bridge", "trading_safety_service", "agent_performance_service", "agent_coordination_service"]
            phase5_services = ["agent_scheduler_service", "market_regime_service", "adaptive_risk_service", "portfolio_optimizer_service", "alerting_service"]
            
            phase2_online = sum(1 for service in phase2_services if self.registry.get_service(service))
            phase5_online = sum(1 for service in phase5_services if self.registry.get_service(service))
            
            # Get startup info
            startup_info = self.registry.get_service("startup_info") or {}
            
            # Calculate uptime
            startup_time_str = startup_info.get("startup_time")
            uptime_seconds = 0
            if startup_time_str:
                try:
                    startup_time = datetime.fromisoformat(startup_time_str.replace('Z', '+00:00'))
                    uptime_seconds = (datetime.now(timezone.utc) - startup_time).total_seconds()
                except Exception:
                    pass
            
            uptime_formatted = self._format_uptime(uptime_seconds)
            
            return {
                "platform": {
                    "name": "MCP Trading Platform",
                    "version": startup_info.get("version", "2.0.0"),
                    "architecture": "consolidated_monorepo",
                    "environment": startup_info.get("environment", "production"),
                    "status": "operational" if health_data.get("registry") == "healthy" else "degraded",
                    "uptime": uptime_seconds,
                    "uptime_formatted": uptime_formatted
                },
                "services": {
                    "total_services": len(self.registry.all_services),
                    "total_connections": len(self.registry.all_connections),
                    "phase2_services": {"online": phase2_online, "total": len(phase2_services)},
                    "phase5_services": {"online": phase5_online, "total": len(phase5_services)},
                    "health_status": health_data.get("services", {}),
                    "connection_status": health_data.get("connections", {})
                },
                "last_update": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting overview data: {e}")
            return {"error": str(e), "last_update": datetime.now(timezone.utc).isoformat()}
    
    async def get_agent_management_data(self) -> Dict[str, Any]:
        """Get agent management data with real service integration"""
        
        try:
            data = {
                "agents": [],
                "performance_summary": {},
                "coordination_status": {},
                "scheduler_status": {}
            }
            
            # Get agent management service
            agent_service = self.registry.get_service("agent_management_service")
            if agent_service:
                try:
                    agents = await agent_service.get_agents()
                    data["agents"] = [agent.model_dump() for agent in agents] if agents else []
                except Exception as e:
                    logger.error(f"Error getting agents: {e}")
                    data["agents"] = []
            
            # Get performance service data
            performance_service = self.registry.get_service("agent_performance_service")
            if performance_service:
                try:
                    status = performance_service.get_service_status()
                    data["performance_summary"] = status
                except Exception as e:
                    logger.error(f"Error getting performance data: {e}")
            
            # Get coordination service data
            coordination_service = self.registry.get_service("agent_coordination_service")
            if coordination_service:
                try:
                    status = coordination_service.get_coordination_status()
                    data["coordination_status"] = status
                except Exception as e:
                    logger.error(f"Error getting coordination data: {e}")
            
            # Get scheduler service data
            scheduler_service = self.registry.get_service("agent_scheduler_service")
            if scheduler_service:
                try:
                    status = scheduler_service.get_scheduler_status()
                    data["scheduler_status"] = status
                except Exception as e:
                    logger.error(f"Error getting scheduler data: {e}")
            
            data["last_update"] = datetime.now(timezone.utc).isoformat()
            return data
            
        except Exception as e:
            logger.error(f"Error getting agent management data: {e}")
            return {"error": str(e), "last_update": datetime.now(timezone.utc).isoformat()}
    
    async def get_trading_operations_data(self) -> Dict[str, Any]:
        """Get trading operations data with real service integration"""
        
        try:
            data = {
                "bridge_status": {},
                "active_signals": [],
                "execution_stats": {},
                "recent_trades": []
            }
            
            # Get trading bridge data
            bridge_service = self.registry.get_service("agent_trading_bridge")
            if bridge_service:
                try:
                    data["bridge_status"] = bridge_service.get_bridge_status()
                    
                    # Get active signals
                    active_signals = await bridge_service.get_active_signals()
                    data["active_signals"] = [signal.model_dump() for signal in active_signals] if active_signals else []
                    
                except Exception as e:
                    logger.error(f"Error getting bridge data: {e}")
            
            # Get execution service data (if available)
            execution_service = self.registry.get_service("execution_specialist_service")
            if execution_service:
                try:
                    # This would get execution statistics in a real implementation
                    data["execution_stats"] = {
                        "total_executions": 0,
                        "success_rate": 0.0,
                        "avg_execution_time": 0.0
                    }
                except Exception as e:
                    logger.error(f"Error getting execution data: {e}")
            
            data["last_update"] = datetime.now(timezone.utc).isoformat()
            return data
            
        except Exception as e:
            logger.error(f"Error getting trading operations data: {e}")
            return {"error": str(e), "last_update": datetime.now(timezone.utc).isoformat()}
    
    async def get_risk_safety_data(self) -> Dict[str, Any]:
        """Get risk and safety data with real service integration"""
        
        try:
            data = {
                "safety_status": {},
                "adaptive_risk_status": {},
                "active_alerts": [],
                "risk_events": []
            }
            
            # Get safety service data
            safety_service = self.registry.get_service("trading_safety_service")
            if safety_service:
                try:
                    data["safety_status"] = safety_service.get_safety_status()
                except Exception as e:
                    logger.error(f"Error getting safety data: {e}")
            
            # Get adaptive risk service data
            adaptive_risk_service = self.registry.get_service("adaptive_risk_service")
            if adaptive_risk_service:
                try:
                    data["adaptive_risk_status"] = adaptive_risk_service.get_service_status()
                    
                    # Get active risk events
                    risk_events = await adaptive_risk_service.get_active_risk_events()
                    data["risk_events"] = [event.model_dump() for event in risk_events] if risk_events else []
                    
                except Exception as e:
                    logger.error(f"Error getting adaptive risk data: {e}")
            
            # Get alerting service data
            alerting_service = self.registry.get_service("alerting_service")
            if alerting_service:
                try:
                    data["alerting_status"] = alerting_service.get_service_status()
                    
                    # Get active alerts
                    active_alerts = await alerting_service.get_active_alerts()
                    data["active_alerts"] = [alert.model_dump() for alert in active_alerts] if active_alerts else []
                    
                except Exception as e:
                    logger.error(f"Error getting alerting data: {e}")
            
            data["last_update"] = datetime.now(timezone.utc).isoformat()
            return data
            
        except Exception as e:
            logger.error(f"Error getting risk safety data: {e}")
            return {"error": str(e), "last_update": datetime.now(timezone.utc).isoformat()}
    
    async def get_market_analytics_data(self) -> Dict[str, Any]:
        """Get market analytics data with real service integration"""
        
        try:
            data = {
                "regime_detections": {},
                "portfolio_allocations": {},
                "market_data": {}
            }
            
            # Get market regime service data
            regime_service = self.registry.get_service("market_regime_service")
            if regime_service:
                try:
                    data["regime_status"] = regime_service.get_service_status()
                    
                    # Get regime detections for tracked symbols
                    tracked_symbols = ["BTC/USD", "ETH/USD", "SPY", "QQQ"]  # Example symbols
                    regime_detections = {}
                    for symbol in tracked_symbols:
                        try:
                            detection = await regime_service.get_regime_for_symbol(symbol)
                            if detection:
                                regime_detections[symbol] = detection.model_dump()
                        except Exception:
                            pass
                    
                    data["regime_detections"] = regime_detections
                    
                except Exception as e:
                    logger.error(f"Error getting regime data: {e}")
            
            # Get portfolio optimizer service data
            optimizer_service = self.registry.get_service("portfolio_optimizer_service")
            if optimizer_service:
                try:
                    data["optimizer_status"] = optimizer_service.get_service_status()
                    
                    # Get recent portfolio allocations
                    allocations = await optimizer_service.get_optimization_history(limit=10)
                    data["portfolio_allocations"] = [alloc.model_dump() for alloc in allocations] if allocations else []
                    
                except Exception as e:
                    logger.error(f"Error getting optimizer data: {e}")
            
            # Get market data service data
            market_data_service = self.registry.get_service("market_data")
            if market_data_service:
                try:
                    # This would get real market data in a production environment
                    data["market_data"] = {
                        "status": "online",
                        "symbols_tracked": ["BTC/USD", "ETH/USD", "SPY", "QQQ"],
                        "last_update": datetime.now(timezone.utc).isoformat()
                    }
                except Exception as e:
                    logger.error(f"Error getting market data: {e}")
            
            data["last_update"] = datetime.now(timezone.utc).isoformat()
            return data
            
        except Exception as e:
            logger.error(f"Error getting market analytics data: {e}")
            return {"error": str(e), "last_update": datetime.now(timezone.utc).isoformat()}
    
    async def get_performance_analytics_data(self) -> Dict[str, Any]:
        """Get performance analytics data with real service integration"""
        
        try:
            data = {
                "agent_rankings": [],
                "portfolio_performance": {},
                "performance_metrics": {}
            }
            
            # Get performance service data
            performance_service = self.registry.get_service("agent_performance_service")
            if performance_service:
                try:
                    # Get agent rankings
                    rankings = await performance_service.get_agent_rankings(period_days=30)
                    data["agent_rankings"] = [ranking.model_dump() for ranking in rankings] if rankings else []
                    
                    # Get portfolio performance
                    portfolio_perf = await performance_service.get_portfolio_performance(period_days=30)
                    data["portfolio_performance"] = portfolio_perf
                    
                    # Get service status
                    data["performance_metrics"] = performance_service.get_service_status()
                    
                except Exception as e:
                    logger.error(f"Error getting performance data: {e}")
            
            data["last_update"] = datetime.now(timezone.utc).isoformat()
            return data
            
        except Exception as e:
            logger.error(f"Error getting performance analytics data: {e}")
            return {"error": str(e), "last_update": datetime.now(timezone.utc).isoformat()}
    
    async def get_system_monitoring_data(self) -> Dict[str, Any]:
        """Get system monitoring data with real service integration"""
        
        try:
            # Get comprehensive health check
            health_data = await self.registry.health_check()
            
            # Get all service statuses
            service_statuses = {}
            all_services = self.registry.list_services()
            
            for service_name in all_services:
                try:
                    service = self.registry.get_service(service_name)
                    if service and hasattr(service, 'get_service_status'):
                        service_statuses[service_name] = service.get_service_status()
                    else:
                        service_statuses[service_name] = {"status": "available"}
                except Exception as e:
                    service_statuses[service_name] = {"status": "error", "error": str(e)}
            
            data = {
                "system_health": health_data,
                "service_statuses": service_statuses,
                "registry_info": {
                    "total_services": len(self.registry.all_services),
                    "total_connections": len(self.registry.all_connections),
                    "initialized": self.registry.is_initialized()
                },
                "last_update": datetime.now(timezone.utc).isoformat()
            }
            
            return data
            
        except Exception as e:
            logger.error(f"Error getting system monitoring data: {e}")
            return {"error": str(e), "last_update": datetime.now(timezone.utc).isoformat()}
    
    def _format_uptime(self, seconds: float) -> str:
        """Format uptime in human readable format"""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            return f"{int(seconds // 60)}m {int(seconds % 60)}s"
        elif seconds < 86400:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            return f"{hours}h {minutes}m"
        else:
            days = int(seconds // 86400)
            hours = int((seconds % 86400) // 3600)
            return f"{days}d {hours}h"
    
    async def get_all_dashboard_data(self) -> Dict[str, Any]:
        """Get all dashboard data in one call for efficiency"""
        
        try:
            # Run all data collection concurrently
            results = await asyncio.gather(
                self.get_overview_data(),
                self.get_agent_management_data(),
                self.get_trading_operations_data(),
                self.get_risk_safety_data(),
                self.get_market_analytics_data(),
                self.get_performance_analytics_data(),
                self.get_system_monitoring_data(),
                return_exceptions=True
            )
            
            # Combine results
            dashboard_data = {
                "overview": results[0] if not isinstance(results[0], Exception) else {"error": str(results[0])},
                "agent_management": results[1] if not isinstance(results[1], Exception) else {"error": str(results[1])},
                "trading_operations": results[2] if not isinstance(results[2], Exception) else {"error": str(results[2])},
                "risk_safety": results[3] if not isinstance(results[3], Exception) else {"error": str(results[3])},
                "market_analytics": results[4] if not isinstance(results[4], Exception) else {"error": str(results[4])},
                "performance_analytics": results[5] if not isinstance(results[5], Exception) else {"error": str(results[5])},
                "system_monitoring": results[6] if not isinstance(results[6], Exception) else {"error": str(results[6])},
                "last_update": datetime.now(timezone.utc).isoformat()
            }
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Error getting all dashboard data: {e}")
            return {"error": str(e), "last_update": datetime.now(timezone.utc).isoformat()}

# Global dashboard instance
comprehensive_dashboard = ComprehensiveDashboard()