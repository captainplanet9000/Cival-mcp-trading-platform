# Cival Dashboard Deployment Guide

## Quick Start

### 1. Environment Setup
```bash
# Frontend
cp .env.example .env.local
# Edit .env.local with your actual values

# Backend  
cp python-ai-services/.env.example python-ai-services/.env
# Edit .env with your actual values
```

### 2. Required Variables
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
DATABASE_URL="postgresql://user:password@host:port/database"

# APIs
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key"
```

### 3. Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy frontend and backend as separate services

### 4. Features Ready
- ✅ Solo operator mode (no authentication)
- ✅ Real-time WebSocket communication  
- ✅ Complete trading dashboard (11 pages)
- ✅ Agent trading system with AI coordination
- ✅ Risk management and analytics
- ✅ Supabase database integration
- ✅ Multi-exchange trading ready

## Architecture
- **Frontend**: Next.js 15 with TypeScript
- **Backend**: FastAPI with Python 3.11+
- **Database**: Supabase PostgreSQL
- **Cache**: Redis Cloud
- **Real-time**: WebSocket communication
- **AI**: OpenAI GPT-4 + Anthropic Claude

## Support
For deployment assistance, see the comprehensive documentation in the codebase.