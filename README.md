# Tarkov Casino

A Tarkov-themed casino gaming website offering classic casino games with virtual currency for entertainment purposes only.

## 🎮 Features

- **Roulette**: Classic casino roulette with Tarkov theming
- **Blackjack**: Strategic card gameplay
- **Case Opening**: Tarkov-themed loot cases with provably fair algorithms
- **Virtual Currency**: Safe gaming with no real money risk
- **Tarkov Theming**: Immersive design with game assets and aesthetics
- **Real-time Statistics**: Comprehensive game analytics and history
- **Provably Fair Gaming**: Cryptographically secure random number generation
- **High-Performance Caching**: Dragonfly (25x faster than Redis) for sub-millisecond response times

## 🏗️ Architecture

This is a monorepo containing:

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 + Vite
- **Backend**: Bun + Hono + TypeScript
- **Database**: Appwrite (BaaS) - Authentication, Databases, Storage, Realtime
- **Cache**: Dragonfly (Redis-compatible) for high-performance caching
- **Real-time**: Appwrite Realtime via WebSocket
- **Testing**: Bun Test with comprehensive test suites
- **Security**: Provably fair algorithms with secure random generation
- **Monitoring**: Performance metrics, health checks, and fairness validation
- **Deployment**: Docker + Coolify

## 📁 Project Structure

```
tarkov-casino/
├── packages/
│   ├── frontend/          # React frontend application
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── backend/           # Bun + Hono backend API
│       ├── src/
│       │   ├── services/  # Redis, cache, game logic
│       │   ├── routes/    # API endpoints
│       │   ├── middleware/# Auth, validation, rate limiting
│       │   └── config/    # Environment, Appwrite setup
│       ├── package.json
│       └── tsconfig.json
├── docs/                  # Comprehensive documentation
│   ├── backend/           # Backend guides (Redis, database, etc.)
│   ├── frontend/          # Frontend architecture
│   ├── api/               # API documentation
│   ├── deployment/        # Deployment guides
│   └── game-rules/        # Game mechanics and rules
├── Dockerfile             # Production deployment
├── coolify.json           # Coolify deployment config
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- [Docker](https://docker.com/) (for local Dragonfly cache - optional)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd tarkov-casino
   bun install
   ```

2. **Install package dependencies:**
   ```bash
   # Backend dependencies
   cd packages/backend
   bun install
   
   # Frontend dependencies
   cd ../frontend
   bun install
   cd ../..
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Appwrite credentials
   ```
   
   > Get your Appwrite credentials from your Appwrite project dashboard

### Development

1. **Start Dragonfly (optional, for caching):**
   ```bash
   docker run -d \
     --name dragonfly \
     -p 6379:6379 \
     --ulimit memlock=-1 \
     docker.dragonflydb.io/dragonflydb/dragonfly
   ```

2. **Start backend development server:**
   ```bash
   cd packages/backend
   bun run dev
   ```

3. **Start frontend development server:**
   ```bash
   cd packages/frontend
   bun run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Health: http://localhost:3000/api/health
   - Detailed Health: http://localhost:3000/api/health/detailed
   - API Metrics: http://localhost:3000/api/metrics

> **Note:** Dragonfly is optional for local development. The app works fine without caching (uses database fallback). See [Redis/Dragonfly documentation](./docs/backend/redis-README.md) for more details.

### Building for Production

1. **Build frontend:**
   ```bash
   cd packages/frontend
   bun run build
   ```

2. **Build backend:**
   ```bash
   cd packages/backend
   bun run build
   ```

3. **Build Docker image:**
   ```bash
   docker build -t tarkov-casino .
   ```

## 🐳 Docker Deployment

### Local Docker Development

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run just the application
docker build -t tarkov-casino .
docker run -p 3000:3000 tarkov-casino
```

### Production Deployment

For detailed production deployment instructions, see [DEPLOYMENT.md](./docs/deployment/deployment.md).

#### Quick Deployment with Coolify

1. **Prepare for deployment:**
   ```bash
   bun run deploy:prepare
   ```

2. **Validate production configuration:**
   ```bash
   bun run deploy:validate
   ```

3. **Configure Coolify service:**
   - Repository: Your Git repository URL
   - Build Pack: Docker
   - Dockerfile: `Dockerfile`
   - Port: `3000`

4. **Add Dragonfly service in Coolify:**
   - Add a new service: Dragonfly
   - Link it to your application
   - Note the connection URL provided by Coolify

5. **Set environment variables in Coolify:**
   ```env
   NODE_ENV=production
   
   # Appwrite Configuration
   APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_api_key
   APPWRITE_DATABASE_ID=tarkov_casino
   
   # Dragonfly/Redis (Optional)
   REDIS_ENABLED=true
   REDIS_URL=redis://default:PASSWORD@dragonfly-service:6379/0
   ```

6. **Deploy and monitor:**
   ```bash
   # Check health after deployment
   bun run health:check:prod
   ```
   
   The health endpoint will show:
   - ✅ Appwrite connectivity (Auth, Database, Storage)
   - ✅ Dragonfly cache status (if enabled)
   - ✅ Overall system health
   - ✅ Game services status

#### Deployment Scripts

- `bun run deploy:prepare` - Build and test Docker image locally
- `bun run deploy:validate` - Validate production environment
- `bun run health:check` - Check local application health
- `bun run health:check:prod` - Check production health
- `bun run docker:build` - Build Docker image only
- `bun run docker:test` - Test Docker image only

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Application
PORT=3000
NODE_ENV=development

# Appwrite Configuration (Primary Database & Services)
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
# Database and Table IDs
APPWRITE_DATABASE_ID=tarkov_casino
APPWRITE_USERS_TABLE_ID=user_profiles
APPWRITE_GAMES_TABLE_ID=game_history
APPWRITE_TRANSACTIONS_TABLE_ID=transactions

# Redis/Dragonfly Configuration (Optional Caching)
REDIS_ENABLED=true
REDIS_URL=redis://default:PASSWORD@dragonfly:6379/0
# Cache TTLs (seconds)
CACHE_USER_PROFILE_TTL=300
CACHE_BALANCE_TTL=60
CACHE_LEADERBOARD_TTL=30
CACHE_STATS_TTL=120

# Game Settings
STARTING_BALANCE=10000
DAILY_BONUS=1000
```

#### Frontend (Vite)
```env
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_API_URL=http://localhost:3000
```

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

### Backend
- [Appwrite Integration](./docs/backend/appwrite-README.md) - Complete Appwrite setup and usage guide
- [Database Guide](./docs/backend/database-README.md) - Database schema and operations
- [Appwrite Realtime](./docs/backend/appwrite-realtime.md) - Real-time features and subscriptions
- [Redis/Dragonfly Caching](./docs/backend/redis-README.md) - Caching implementation and best practices
- [Statistics System](./docs/backend/statistics-README.md) - Analytics and statistics

### API
- [API Reference](./docs/api/README.md) - Complete API endpoint documentation

### Deployment
- [Deployment Guide](./docs/deployment/deployment.md) - Production deployment with Coolify

### Frontend
- [Frontend Architecture](./docs/frontend/README.md) - Frontend structure and components
- [Performance Optimization](./docs/frontend/performance-optimization.md) - Frontend performance tips

### Game Rules
- [Roulette](./docs/game-rules/roulette.md) - Roulette game mechanics
- [Blackjack](./docs/game-rules/blackjack.md) - Blackjack rules and strategy
- [Case Opening](./docs/game-rules/case-opening.md) - Provably fair case opening

## 🧪 Testing

```bash
# Run backend tests
cd packages/backend
bun test

# Run frontend tests
cd packages/frontend
bun run test
```

## 📚 API Documentation

### Health & Monitoring
- **GET** `/api/health` - Basic service health status
- **GET** `/api/health/detailed` - Detailed system information
- **GET** `/api/ready` - Kubernetes-style readiness probe
- **GET** `/api/live` - Kubernetes-style liveness probe
- **GET** `/api/metrics` - Prometheus-compatible metrics

### Authentication
- **POST** `/api/auth/register` - User registration
- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/logout` - User logout
- **POST** `/api/auth/reset-password` - Password reset
- **POST** `/api/auth/refresh` - Refresh authentication token

### User
- **GET** `/api/user/profile` - Get user profile
- **GET** `/api/user/balance` - Get current balance
- **GET** `/api/user/history` - Get user game history
- **GET** `/api/user/stats` - Get user statistics
- **GET** `/api/user/transactions` - Get transaction history
- **PUT** `/api/user/profile` - Update user profile
- **POST** `/api/user/validate-balance` - Validate sufficient balance
- **POST** `/api/user/daily-bonus` - Claim daily bonus

### Games
- **GET** `/api/games` - List all available games
- **GET** `/api/games/roulette` - Get roulette game information
- **POST** `/api/games/roulette/bet` - Place roulette bet
- **GET** `/api/games/blackjack` - Get blackjack game information
- **POST** `/api/games/blackjack/start` - Start blackjack hand
- **POST** `/api/games/blackjack/action` - Perform blackjack action (hit, stand, double, split)
- **GET** `/api/games/cases` - Get available case types
- **GET** `/api/games/cases/:caseTypeId` - Get specific case details
- **POST** `/api/games/cases/start` - Start case opening (deduct price)
- **POST** `/api/games/cases/complete` - Complete case opening (credit winnings)
- **POST** `/api/games/cases/open` - One-step case opening
- **GET** `/api/games/cases/stats/:userId?` - Get case opening statistics

### Statistics
- **GET** `/api/statistics/basic` - Get basic game statistics
- **GET** `/api/statistics/advanced` - Get comprehensive game statistics
- **GET** `/api/statistics/history` - Get filtered game history
- **GET** `/api/statistics/time-series` - Get time series data for charts
- **GET** `/api/statistics/game-breakdown` - Get statistics by game type
- **GET** `/api/statistics/streaks` - Get winning/losing streak data
- **GET** `/api/statistics/betting-patterns` - Get betting pattern analysis
- **GET** `/api/statistics/playing-habits` - Get playing habit statistics
- **GET** `/api/statistics/global` - Get global platform statistics
- **GET** `/api/statistics/export` - Export user statistics


## 🎨 Theming

The application uses a custom Tarkov-inspired theme with:

- **Colors**: Dark military-style palette
- **Typography**: Roboto Condensed font family
- **Assets**: Tarkov currency symbols and iconography
- **Animations**: Tactical-style transitions and effects

## 🔒 Security

- **Appwrite Authentication**: Secure user sessions with built-in auth
- **Role-based Access Control**: Appwrite permissions and teams
- **Input Validation**: Zod schema validation on all endpoints
- **Rate Limiting**: API endpoint protection (powered by Dragonfly cache)
- **Secure RNG**: Cryptographically secure random number generation
- **Provably Fair**: Transparent algorithms with verification
- **Audit Logging**: Complete transaction history in Appwrite
- **Data Isolation**: Row-level permissions via Appwrite

## ⚡ Performance

- **Dragonfly Cache**: Redis-compatible in-memory cache (25x faster than Redis)
- **Bun Runtime**: Ultra-fast JavaScript/TypeScript runtime
- **Native Redis Client**: Zero-dependency caching with automatic pipelining
- **Connection Pooling**: Efficient database connection reuse
- **Graceful Degradation**: Automatic fallback to database if cache unavailable
- **Sub-millisecond Cache Hits**: Typical cache response time < 1ms

## 📈 Monitoring

The application includes comprehensive monitoring capabilities:

### Health Check Endpoints

- **GET** `/api/health` - Basic health status
- **GET** `/api/health/detailed` - Detailed system information
- **GET** `/api/ready` - Kubernetes-style readiness probe
- **GET** `/api/live` - Kubernetes-style liveness probe
- **GET** `/api/metrics` - Prometheus-compatible metrics

### Logging

- **Structured Logging**: JSON format in production
- **Request Logging**: HTTP requests with performance metrics
- **Game Logging**: Game actions and events
- **Security Logging**: Authentication and security events
- **Error Tracking**: Comprehensive error reporting with request IDs

### Monitoring Tools

```bash
# Check application health
curl http://localhost:3000/api/health

# Get detailed health information
curl http://localhost:3000/api/health/detailed

# View metrics (if enabled)
curl http://localhost:3000/api/metrics
```

### Production Monitoring

- **Coolify Integration**: Automatic health checks and monitoring
- **Log Aggregation**: Structured logs for analysis
- **Performance Metrics**: Response times and resource usage
- **Error Tracking**: Automatic error detection and alerting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is for educational and entertainment purposes only. No real money gambling is involved.

## 🎯 Roadmap

- [x] Roulette game implementation
- [x] Blackjack game implementation  
- [x] Case opening game with fairness algorithms
- [x] Comprehensive statistics and analytics
- [x] Real-time features via Socket.io
- [x] Performance monitoring and health checks
- [ ] Mobile app development
- [ ] Additional casino games
- [ ] Tournament system
- [ ] Advanced leaderboards
- [ ] Social features and chat