# Tarkov Casino

A Tarkov-themed casino gaming website offering classic casino games with virtual currency for entertainment purposes only.

## 🎮 Features

- **Roulette**: Classic casino roulette with Tarkov theming
- **Blackjack**: Strategic card gameplay

- **Virtual Currency**: Safe gaming with no real money risk
- **Tarkov Theming**: Immersive design with game assets and aesthetics

## 🏗️ Architecture

This is a monorepo containing:

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Bun + Hono + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Socket.io + Supabase Realtime
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
- [Node.js](https://nodejs.org/) 18+ (for frontend tooling)

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

For detailed production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

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

### Health Check
- **GET** `/api/health` - Service health status

### Authentication
- **POST** `/api/auth/register` - User registration
- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/logout` - User logout

### Games
- **POST** `/api/games/roulette/bet` - Place roulette bet
- **POST** `/api/games/blackjack/start` - Start blackjack hand


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

- [ ] Complete game implementations
- [ ] Real-time multiplayer features
- [ ] Advanced statistics and analytics
- [ ] Mobile app development
- [ ] Additional casino games
- [ ] Tournament system