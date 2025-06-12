"""
Service Initialization Module
Handles the initialization of all platform services with proper dependency injection
"""

import logging
from typing import Dict, Any, List
import asyncio

from .service_registry import registry
from .database_manager import db_manager

# Import all services
from services.market_data_service import MarketDataService
from services.historical_data_service import HistoricalDataService
from services.trading_engine_service import TradingEngineService
from services.order_management_service import OrderManagementService
from services.risk_management_service import RiskManagementService
from services.portfolio_tracker_service import PortfolioTrackerService
from services.ai_prediction_service import AIPredictionService
from services.technical_analysis_service import TechnicalAnalysisService
from services.sentiment_analysis_service import SentimentAnalysisService
from services.ml_portfolio_optimizer_service import MLPortfolioOptimizerService
from services.agent_management_service import AgentManagementService
from services.execution_specialist_service import ExecutionSpecialistService
from services.hyperliquid_execution_service import HyperliquidExecutionService
from services.strategy_config_service import StrategyConfigService
from services.watchlist_service import WatchlistService
from services.user_preference_service import UserPreferenceService

# Import agent frameworks
from agents.crew_setup import trading_analysis_crew
from agents.autogen_setup import autogen_trading_system

logger = logging.getLogger(__name__)

class ServiceInitializer:
    """
    Handles the initialization of all platform services
    Manages service dependencies and startup order
    """
    
    def __init__(self):
        self.initialization_order = [
            # Phase 1: Core Infrastructure Services
            "market_data",
            "historical_data",
            
            # Phase 2: Trading Engine Services (dependent on core infrastructure)
            "portfolio_tracker",
            "trading_engine", 
            "order_management",
            "risk_management",
            
            # Phase 3: AI and Analytics Services (independent)
            "ai_prediction",
            "technical_analysis",
            "sentiment_analysis",
            "ml_portfolio_optimizer",
            
            # Phase 4: Agent and Execution Services (dependent on trading engine)
            "execution_specialist",
            "hyperliquid_execution",
            "agent_management",
            
            # Phase 5: Business Logic Services
            "strategy_config",
            "watchlist",
            "user_preference",
            
            # Phase 6: Agent Frameworks
            "crew_trading_analysis",
            "autogen_trading_system"
        ]
    
    async def initialize_all_services(self) -> Dict[str, str]:
        """Initialize all services in the correct order"""
        logger.info("🔧 Starting service initialization...")
        
        # Ensure database connections are ready
        if not db_manager.is_initialized():
            await db_manager.initialize_connections()
        
        results = {}
        
        for service_name in self.initialization_order:
            try:
                result = await self._initialize_service(service_name)
                results[service_name] = result
                logger.info(f"✅ {service_name} initialized successfully")
            except Exception as e:
                results[service_name] = f"failed: {str(e)}"
                logger.error(f"❌ Failed to initialize {service_name}: {e}")
                
                # Check if this is a critical service
                if service_name in ["market_data", "trading_engine", "portfolio_tracker"]:
                    logger.error(f"Critical service {service_name} failed - stopping initialization")
                    break
        
        # Register all connections in the registry
        self._register_connections()
        
        registry.mark_initialized()
        logger.info("✅ Service initialization completed")
        
        return results
    
    async def _initialize_service(self, service_name: str) -> str:
        """Initialize a single service"""
        
        if service_name == "market_data":
            service = MarketDataService(redis_client=db_manager.get_redis_client())
            registry.register_service("market_data", service)
            return "initialized"
        
        elif service_name == "historical_data":
            service = HistoricalDataService(supabase_client=db_manager.get_supabase_client())
            registry.register_service("historical_data", service)
            return "initialized"
        
        elif service_name == "portfolio_tracker":
            service = PortfolioTrackerService(
                session_factory=db_manager.get_session_factory(),
                market_data_service=registry.get_service("market_data")
            )
            registry.register_service("portfolio_tracker", service)
            return "initialized"
        
        elif service_name == "trading_engine":
            service = TradingEngineService(
                market_data_service=registry.get_service("market_data")
            )
            registry.register_service("trading_engine", service)
            return "initialized"
        
        elif service_name == "order_management":
            service = OrderManagementService(
                session_factory=db_manager.get_session_factory()
            )
            registry.register_service("order_management", service)
            return "initialized"
        
        elif service_name == "risk_management":
            service = RiskManagementService(
                portfolio_service=registry.get_service("portfolio_tracker")
            )
            registry.register_service("risk_management", service)
            return "initialized"
        
        elif service_name == "ai_prediction":
            service = AIPredictionService()
            registry.register_service("ai_prediction", service)
            return "initialized"
        
        elif service_name == "technical_analysis":
            service = TechnicalAnalysisService()
            registry.register_service("technical_analysis", service)
            return "initialized"
        
        elif service_name == "sentiment_analysis":
            service = SentimentAnalysisService()
            registry.register_service("sentiment_analysis", service)
            return "initialized"
        
        elif service_name == "ml_portfolio_optimizer":
            service = MLPortfolioOptimizerService()
            registry.register_service("ml_portfolio_optimizer", service)
            return "initialized"
        
        elif service_name == "execution_specialist":
            service = ExecutionSpecialistService()
            registry.register_service("execution_specialist", service)
            return "initialized"
        
        elif service_name == "hyperliquid_execution":
            service = HyperliquidExecutionService()
            registry.register_service("hyperliquid_execution", service)
            return "initialized"
        
        elif service_name == "agent_management":
            service = AgentManagementService(session_factory=db_manager.get_session_factory())
            # Load existing agent statuses from database
            await service.load_all_agent_statuses_from_db()
            registry.register_service("agent_management", service)
            return "initialized"
        
        elif service_name == "strategy_config":
            service = StrategyConfigService(session_factory=db_manager.get_session_factory())
            registry.register_service("strategy_config", service)
            return "initialized"
        
        elif service_name == "watchlist":
            service = WatchlistService(supabase_client=db_manager.get_supabase_client())
            registry.register_service("watchlist", service)
            return "initialized"
        
        elif service_name == "user_preference":
            service = UserPreferenceService(supabase_client=db_manager.get_supabase_client())
            registry.register_service("user_preference", service)
            return "initialized"
        
        elif service_name == "crew_trading_analysis":
            # Initialize CrewAI framework
            registry.register_service("crew_trading_analysis", trading_analysis_crew)
            return "initialized"
        
        elif service_name == "autogen_trading_system":
            # Initialize AutoGen framework
            registry.register_service("autogen_trading_system", autogen_trading_system)
            return "initialized"
        
        else:
            raise ValueError(f"Unknown service: {service_name}")
    
    def _register_connections(self):
        """Register all database connections in the service registry"""
        registry.register_connection("supabase", db_manager.get_supabase_client())
        registry.register_connection("redis", db_manager.get_redis_client())
        registry.register_connection("async_redis", db_manager.get_async_redis_client())
        registry.register_connection("database_engine", db_manager.get_database_engine())
        registry.register_connection("session_factory", db_manager.get_session_factory())
    
    async def get_service_dependencies(self, service_name: str) -> List[str]:
        """Get the dependencies for a service"""
        dependencies = {
            "market_data": [],
            "historical_data": [],
            "portfolio_tracker": ["market_data"],
            "trading_engine": ["market_data"],
            "order_management": [],
            "risk_management": ["portfolio_tracker"],
            "ai_prediction": [],
            "technical_analysis": [],
            "sentiment_analysis": [],
            "ml_portfolio_optimizer": [],
            "execution_specialist": [],
            "hyperliquid_execution": [],
            "agent_management": [],
            "strategy_config": [],
            "watchlist": [],
            "user_preference": [],
            "crew_trading_analysis": [],
            "autogen_trading_system": []
        }
        
        return dependencies.get(service_name, [])
    
    async def health_check_all_services(self) -> Dict[str, Any]:
        """Perform health check on all initialized services"""
        return await registry.health_check()

# Global service initializer
service_initializer = ServiceInitializer()

def get_service_initializer() -> ServiceInitializer:
    """Get the global service initializer"""
    return service_initializer