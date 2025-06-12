"""
Simplified AI Services Startup
Basic FastAPI server for testing without complex dependencies
"""
import os
import json
import asyncio
from typing import Dict, Any
from datetime import datetime

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not available - using environment variables only")

# Basic configuration
API_PORT = int(os.getenv("PORT", 9000))
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

# Try to import FastAPI
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    print("FastAPI not available - will run in basic mode")

class SimpleAIServices:
    """Simplified AI services for testing"""
    
    def __init__(self):
        self.agents = {}
        self.market_data = {}
        self.trades = []
        self.status = "running"
        
    def initialize_agents(self):
        """Initialize basic trading agents"""
        self.agents = {
            "trading_agent_001": {
                "name": "Darvas Box Strategy",
                "status": "active",
                "strategy": "darvas_box",
                "cash": 100000.0,
                "positions": {},
                "last_update": datetime.now().isoformat()
            },
            "trading_agent_002": {
                "name": "Elliott Wave Strategy", 
                "status": "active",
                "strategy": "elliott_wave",
                "cash": 100000.0,
                "positions": {},
                "last_update": datetime.now().isoformat()
            },
            "trading_agent_003": {
                "name": "SMA Crossover Strategy",
                "status": "active", 
                "strategy": "sma_crossover",
                "cash": 100000.0,
                "positions": {},
                "last_update": datetime.now().isoformat()
            }
        }
        
    def get_market_data(self, symbol: str):
        """Simulate market data"""
        return {
            "symbol": symbol,
            "price": 150.0 + (hash(symbol) % 100),
            "volume": 1000000,
            "timestamp": datetime.now().isoformat(),
            "source": "simulated"
        }
        
    def simulate_trade(self, agent_id: str, symbol: str, action: str):
        """Simulate a paper trade"""
        if agent_id not in self.agents:
            return {"error": "Agent not found"}
            
        trade = {
            "id": len(self.trades) + 1,
            "agent_id": agent_id,
            "symbol": symbol,
            "action": action,
            "quantity": 10,
            "price": self.get_market_data(symbol)["price"],
            "timestamp": datetime.now().isoformat(),
            "paper_trade": True
        }
        
        self.trades.append(trade)
        return trade

def create_simple_app():
    """Create FastAPI app if available"""
    if not FASTAPI_AVAILABLE:
        return None
        
    app = FastAPI(
        title="Cival Dashboard AI Services",
        description="Simplified AI Trading Services",
        version="1.0.0"
    )
    
    # Enable CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize services
    ai_services = SimpleAIServices()
    ai_services.initialize_agents()
    
    @app.get("/")
    async def root():
        return {
            "message": "Cival Dashboard AI Services",
            "status": "running",
            "version": "1.0.0",
            "agents_count": len(ai_services.agents)
        }
    
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "anthropic_api": "configured" if ANTHROPIC_API_KEY else "missing",
                "openai_api": "configured" if OPENAI_API_KEY else "missing", 
                "alpha_vantage": "configured" if ALPHA_VANTAGE_API_KEY else "missing"
            }
        }
    
    @app.get("/agents")
    async def get_agents():
        return {
            "agents": ai_services.agents,
            "count": len(ai_services.agents)
        }
    
    @app.get("/agents/{agent_id}")
    async def get_agent(agent_id: str):
        if agent_id not in ai_services.agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        return ai_services.agents[agent_id]
    
    @app.get("/market-data/{symbol}")
    async def get_market_data(symbol: str):
        return ai_services.get_market_data(symbol.upper())
    
    @app.post("/trades/simulate")
    async def simulate_trade(trade_data: Dict[str, Any]):
        agent_id = trade_data.get("agent_id")
        symbol = trade_data.get("symbol", "AAPL") 
        action = trade_data.get("action", "buy")
        
        result = ai_services.simulate_trade(agent_id, symbol, action)
        return result
    
    @app.get("/trades")
    async def get_trades():
        return {
            "trades": ai_services.trades,
            "count": len(ai_services.trades)
        }
    
    return app

def run_simple_mode():
    """Run in simple mode without FastAPI"""
    print("🚀 Starting Cival Dashboard AI Services (Simple Mode)")
    print("=" * 50)
    print(f"Port: {API_PORT}")
    print(f"Anthropic API: {'✅' if ANTHROPIC_API_KEY else '❌'}")
    print(f"OpenAI API: {'✅' if OPENAI_API_KEY else '❌'}")
    print(f"Alpha Vantage API: {'✅' if ALPHA_VANTAGE_API_KEY else '❌'}")
    print("=" * 50)
    
    ai_services = SimpleAIServices()
    ai_services.initialize_agents()
    
    print(f"✅ Initialized {len(ai_services.agents)} trading agents")
    print("📊 Agents ready for paper trading")
    print("🔗 Run frontend to connect to services")
    
    # Keep running
    try:
        while True:
            import time
            time.sleep(10)
            print(f"📈 Services running... {datetime.now().strftime('%H:%M:%S')}")
    except KeyboardInterrupt:
        print("\n🛑 Shutting down AI services...")

def main():
    """Main entry point"""
    if FASTAPI_AVAILABLE:
        print("🚀 Starting Cival Dashboard AI Services with FastAPI")
        app = create_simple_app()
        if app:
            uvicorn.run(
                app,
                host="0.0.0.0",
                port=API_PORT,
                log_level="info"
            )
        else:
            run_simple_mode()
    else:
        run_simple_mode()

if __name__ == "__main__":
    main()