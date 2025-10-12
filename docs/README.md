# Tarkov Casino Documentation

Welcome to the comprehensive documentation for the Tarkov Casino project - a Tarkov-themed casino gaming website with virtual currency.

---

## 📚 Documentation Index

### Getting Started
- [Main README](../README.md) - Project overview and quick start
- [Migration Summary](./MIGRATION-SUMMARY.md) - Supabase to Appwrite migration details

### Backend Documentation

#### Core Systems
- [Appwrite Integration Guide](./backend/appwrite-README.md) - **START HERE** for Appwrite setup
- [Database Guide](./backend/database-README.md) - Database schema and operations
- [Appwrite Realtime](./backend/appwrite-realtime.md) - Real-time features and WebSocket subscriptions
- [Statistics System](./backend/statistics-README.md) - Game analytics and statistics

#### Performance & Caching
- [Redis/Dragonfly Caching](./backend/redis-README.md) - High-performance caching layer
- [Redis Quick Reference](./backend/REDIS_QUICK_REFERENCE.md) - Quick reference guide

### Frontend Documentation
- [Frontend Architecture](./frontend/README.md) - React app structure and Appwrite client SDK
- [Performance Optimization](./frontend/performance-optimization.md) - Frontend performance guide
- [Roulette Performance Fixes](./frontend/roulette-performance-fixes.md) - Game-specific optimizations
- [Component Hooks](./frontend/hooks-README.md) - Custom React hooks documentation
- [Game Components](./frontend/games-components-README.md) - Game component architecture
- [Styles Guide](./frontend/styles-README.md) - Design system and styling

### API Documentation
- [API Reference](./api/README.md) - Complete API endpoint documentation
- [API Authentication](./api/README.md#authentication) - Appwrite authentication flow
- [Real-time Events](./api/README.md#real-time-updates) - Appwrite Realtime channels

### Game Rules
- [Roulette Rules](./game-rules/roulette.md) - Classic casino roulette
- [Blackjack Rules](./game-rules/blackjack.md) - Strategic card game
- [Case Opening Rules](./game-rules/case-opening.md) - Tarkov-themed case opening

### Deployment & Operations
- [Deployment Guide](./deployment/deployment.md) - **Production deployment** with Coolify + Appwrite
- [Deployment README](./deployment/README.md) - Detailed deployment procedures
- [Backup & Recovery](./database/backup-recovery.md) - Appwrite backup strategies

### Maintenance
- [Maintenance Guide](./maintenance/README.md) - Routine maintenance procedures
- [Frontend Maintenance](./maintenance/frontend-maintenance.md) - Frontend-specific maintenance

### Testing
- [Testing Guide](./testing/testing.md) - Comprehensive testing with Bun Test

### Additional Guides
- [Chat System](./chat-system.md) - Appwrite Realtime chat implementation
- [Carousel Management](./carousel-management-guide.md) - Case opening carousel system
- [FontAwesome Setup](./fontawesome-docker-setup.md) - FontAwesome Pro in Docker

### User Documentation
- [User Guide](./user-guide/README.md) - End-user documentation

### Architecture
- [Frontend Architecture](./architecture/frontend-architecture.md) - Detailed frontend architecture

---

## 🎯 Quick Links

### For Developers

**First Time Setup:**
1. Read [Main README](../README.md) for quick start
2. Follow [Appwrite Integration Guide](./backend/appwrite-README.md) for backend setup
3. Configure [Frontend](./frontend/README.md) with Appwrite credentials
4. Review [API Documentation](./api/README.md) for endpoints

**Daily Development:**
- [Appwrite Realtime](./backend/appwrite-realtime.md) for real-time features
- [Redis/Dragonfly Guide](./backend/redis-README.md) for caching
- [Testing Guide](./testing/testing.md) for running tests

**Deployment:**
- [Deployment Guide](./deployment/deployment.md) for production setup
- [Backup & Recovery](./database/backup-recovery.md) for data protection

### For Operations

**Monitoring:**
- [Maintenance Guide](./maintenance/README.md) for routine tasks
- API Health: `/api/health` and `/api/health/detailed`
- Appwrite Console for service monitoring

**Troubleshooting:**
- [Deployment Troubleshooting](./deployment/deployment.md#troubleshooting)
- [Appwrite Documentation](https://appwrite.io/docs)

---

## 🏗️ Technology Stack

### Backend
- **Runtime**: Bun (latest)
- **Framework**: Hono 4.9+
- **Database**: Appwrite 18.0+ (BaaS)
- **Cache**: Dragonfly (Redis-compatible)
- **Language**: TypeScript 5.9+
- **Real-time**: Appwrite Realtime (WebSocket)

### Frontend
- **Framework**: React 19.1+
- **Build Tool**: Vite 7.1+
- **Styling**: Tailwind CSS 4.1+
- **Routing**: React Router 7.9+
- **State**: TanStack Query 5.89+
- **Animations**: Framer Motion 12.23+
- **Language**: TypeScript 5.9+

### Testing
- **Test Runner**: Bun Test (built-in)
- **React Testing**: @testing-library/react 16.3+
- **DOM Environment**: happy-dom 18.0+

### DevOps
- **Containerization**: Docker
- **Orchestration**: Coolify v4
- **CI/CD**: GitHub Actions (with Bun)

---

## 📖 Documentation Standards

### File Organization

- **Backend**: `/docs/backend/` - Server-side documentation
- **Frontend**: `/docs/frontend/` - Client-side documentation
- **API**: `/docs/api/` - API reference
- **Deployment**: `/docs/deployment/` - Operations and deployment
- **Game Rules**: `/docs/game-rules/` - Game mechanics

### Writing Style

- **Clear Headers**: Use descriptive section headers
- **Code Examples**: Include working code examples
- **Version Info**: Include version numbers where relevant
- **Last Updated**: Add update dates to major docs
- **Links**: Cross-reference related documentation

---

## 🔄 Keeping Documentation Updated

### When to Update Documentation

1. **Feature Changes**: Update relevant docs when features change
2. **API Changes**: Update API docs immediately
3. **Configuration Changes**: Update environment variable docs
4. **Dependencies**: Update version numbers in tech stack
5. **Deprecations**: Mark deprecated features clearly

### Documentation Review Schedule

- **Weekly**: Review recently changed features
- **Monthly**: Comprehensive documentation review
- **Quarterly**: Major documentation audit

---

## 🤝 Contributing to Documentation

### Guidelines

1. **Accuracy**: Verify all information is current
2. **Examples**: Include practical code examples
3. **Testing**: Test all code examples before documenting
4. **Clarity**: Write for developers of all skill levels
5. **Consistency**: Follow existing documentation patterns

### Documentation Pull Requests

1. Create feature branch: `docs/description`
2. Update relevant documentation
3. Test any code examples
4. Submit PR with clear description
5. Link to related code changes

---

## 📞 Support

### Internal Resources
- [GitHub Issues](https://github.com/your-repo/issues)
- [Development Team](mailto:dev@example.com)

### External Resources
- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Discord](https://appwrite.io/discord)
- [Bun Documentation](https://bun.sh/docs)
- [React Documentation](https://react.dev)

---

## ⚠️ Important Notes

### Migration from Supabase

This project has migrated from Supabase to Appwrite. See [Migration Summary](./MIGRATION-SUMMARY.md) for details.

**Old Supabase migration files are kept for reference only** and should not be used for new development:
- `packages/backend/src/database/migrations/*.sql` - PostgreSQL migrations (deprecated)
- Old Supabase configuration files

### Appwrite as Primary Backend

**All new development must use Appwrite:**
- ✅ Use Appwrite SDK for all database operations
- ✅ Use Appwrite Auth for authentication
- ✅ Use Appwrite Realtime for live updates
- ❌ Do not add new Supabase dependencies
- ❌ Do not use PostgreSQL directly

---

**Last Updated:** 2025-10-12  
**Documentation Version:** 2.0 (Post-Migration)  
**Status:** ✅ Current

