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

## 🏗️ Architecture

This is a monorepo containing:

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Bun + Hono + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Socket.io + Supabase Realtime
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
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml     # Local development with Supabase
├── Dockerfile            # Production deployment
├── coolify.json          # Coolify deployment config
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- [Docker](https://docker.com/) (for local Supabase)

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
   # Edit .env with your configuration
   ```

### Development

1. **Start local Supabase (optional):**
   ```bash
   docker-compose up -d supabase-db supabase-auth supabase-rest
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

4. **Set environment variables in Coolify:**
   ```env
   NODE_ENV=production
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_production_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
   JWT_SECRET=your_secure_jwt_secret_32_chars_min
   ```

5. **Deploy and monitor:**
   ```bash
   # Check health after deployment
   bun run health:check:prod
   ```

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
# Supabase Configuration
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Application
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret

# Game Settings
STARTING_BALANCE=10000
DAILY_BONUS=1000

# Case Opening Configuration
CASE_OPENING_ENABLED=true
FAIRNESS_VERIFICATION=true
```

#### Frontend (Vite)
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3000
```

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

- JWT-based authentication via Supabase Auth
- Row Level Security (RLS) for data protection
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure random number generation for games
- Provably fair gaming algorithms
- Cryptographic verification for case opening results
- Comprehensive audit logging for all game transactions

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