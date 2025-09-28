# Case Opening Game Architecture Documentation

## System Architecture Overview

The Case Opening Game refactoring implements a clean, maintainable architecture with clear separation of concerns and simplified state management.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Case Opening Game                        │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer (Components)                           │
│  ├── CaseOpeningGame.tsx (Main Container)                  │
│  ├── CaseSelector.tsx (Case Selection)                     │
│  ├── CaseOpeningAnimation.tsx (Unified Animation)           │
│  ├── CaseResult.tsx (Result Display)                       │
│  └── CaseHistory.tsx (History Display)                    │
├─────────────────────────────────────────────────────────────┤
│  Logic Layer (Hooks)                                        │
│  ├── useCaseOpeningGame.ts (Centralized State)             │
│  ├── useCaseAnimation.ts (Animation Control)               │
│  ├── useCaseData.ts (Data Management)                      │
│  ├── useCaseOpening.ts (API Integration)                   │
│  └── useErrorHandling.ts (Error Management)                │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (API & Cache)                               │
│  ├── caseOpeningApi.ts (API Client)                        │
│  ├── caseCache.ts (Caching Service)                        │
│  └── performanceMonitoring.ts (Metrics)                    │
├─────────────────────────────────────────────────────────────┤
│  Utility Layer (Helpers)                                   │
│  ├── carousel.ts (Animation Utilities)                     │
│  ├── errorHandling.ts (Error Utilities)                    │
│  ├── currency.ts (Currency Formatting)                     │
│  └── animationVariants.ts (Animation Configs)               │
└─────────────────────────────────────────────────────────────┘
```

## State Management Architecture

### Simplified State Machine

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  IDLE   │───▶│ LOADING │───▶│ OPENING │───▶│ANIMATING│
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     ▲              │              │              │
     │              ▼              ▼              ▼
     │         ┌─────────┐    ┌─────────┐    ┌─────────┐
     └─────────│  ERROR   │◀───│ REVEALING│◀───│ANIMATING│
               └─────────┘    └─────────┘    └─────────┘
                     │              │
                     ▼              ▼
               ┌─────────┐    ┌─────────┐
               │ RECOVERY│    │ COMPLETE│
               └─────────┘    └─────────┘
```

### State Transition Flow

```
User Action: Select Case
    │
    ▼
┌─────────┐
│  IDLE   │ ──┐
└─────────┘   │
    │        │
    ▼        │
┌─────────┐  │
│ LOADING │  │
└─────────┘  │
    │        │
    ▼        │
┌─────────┐  │
│ OPENING │  │
└─────────┘  │
    │        │
    ▼        │
┌─────────┐  │
│ANIMATING│  │
└─────────┘  │
    │        │
    ▼        │
┌─────────┐  │
│REVEALING│  │
└─────────┘  │
    │        │
    ▼        │
┌─────────┐  │
│ COMPLETE│  │
└─────────┘  │
    │        │
    └────────┘
    │
    ▼
┌─────────┐
│  IDLE   │ (Reset)
└─────────┘
```

## Component Interaction Flow

### Case Opening Workflow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CaseSelector  │───▶│ CaseOpeningGame │───▶│useCaseOpeningGame│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │              ┌─────────────────┐
         │                       │              │  useCaseData    │
         │                       │              └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │              ┌─────────────────┐
         │                       │              │ useCaseOpening  │
         │                       │              └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │              ┌─────────────────┐
         │                       │              │caseOpeningApi.ts│
         │                       │              └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │CaseOpeningAnimation│
         │              └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │ VirtualizedCarousel│
         │              └─────────────────┘
         │
         ▼
┌─────────────────┐
│   CaseResult    │
└─────────────────┘
```

## Animation System Architecture

### Unified Animation System

```
┌─────────────────────────────────────────────────────────────┐
│                CaseOpeningAnimation                         │
├─────────────────────────────────────────────────────────────┤
│  Animation Type Selection                                   │
│  ├── Carousel Animation (Primary)                          │
│  │   ├── VirtualizedCarousel                               │
│  │   ├── Hardware Acceleration                             │
│  │   └── 60 FPS Performance                               │
│  └── Reveal Animation (Fallback)                          │
│      ├── Simple Item Display                               │
│      ├── Error Recovery                                    │
│      └── Accessibility Support                             │
├─────────────────────────────────────────────────────────────┤
│  Animation Configuration                                   │
│  ├── type: 'carousel' | 'reveal'                          │
│  ├── duration: number (ms)                                 │
│  ├── easing: number[] (cubic-bezier)                       │
│  ├── items: CarouselItemData[]                             │
│  └── winningIndex: number                                  │
├─────────────────────────────────────────────────────────────┤
│  Performance Optimization                                  │
│  ├── Virtualization (7 visible items)                     │
│  ├── RequestAnimationFrame                                 │
│  ├── Hardware Acceleration                                 │
│  └── Memory Management                                     │
└─────────────────────────────────────────────────────────────┘
```

### Animation Flow

```
Animation Start
    │
    ▼
┌─────────────┐
│ Type Check  │
└─────────────┘
    │
    ├─ Carousel ──┐
    │             │
    │             ▼
    │    ┌─────────────┐
    │    │ Setup Items │
    │    └─────────────┘
    │             │
    │             ▼
    │    ┌─────────────┐
    │    │ Start Spin  │
    │    └─────────────┘
    │             │
    │             ▼
    │    ┌─────────────┐
    │    │ Slow Down  │
    │    └─────────────┘
    │             │
    │             ▼
    │    ┌─────────────┐
    │    │ Stop at Win │
    │    └─────────────┘
    │             │
    │             ▼
    │    ┌─────────────┐
    │    │ Complete    │
    │    └─────────────┘
    │
    └─ Reveal ──────┐
                    │
                    ▼
            ┌─────────────┐
            │ Show Item   │
            └─────────────┘
                    │
                    ▼
            ┌─────────────┐
            │ Complete    │
            └─────────────┘
```

## Data Flow Architecture

### API Integration Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer    │    │   Backend       │
│                 │    │                 │    │                 │
│ useCaseOpening  │───▶│caseOpeningApi.ts│───▶│ /api/cases/open │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │              ┌─────────────────┐
         │                       │              │ Case Service    │
         │                       │              │                 │
         │                       │              │ 1. Validate     │
         │                       │              │ 2. Select Item  │
         │                       │              │ 3. Process Tx  │
         │                       │              │ 4. Return Result│
         │                       │              └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │              ┌─────────────────┐
         │                       │              │ Database        │
         │                       │              │                 │
         │                       │              │ - User Balance  │
         │                       │              │ - Case Items    │
         │                       │              │ - Transactions │
         │                       │              └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Cache Layer   │    │   Response      │
│                 │    │                 │
│ - Case Types    │    │ - Result        │
│ - User Data     │    │ - Transaction   │
│ - TTL Cache     │    │ - Status        │
└─────────────────┘    └─────────────────┘
```

## Error Handling Architecture

### Error Handling Flow

```
┌─────────────────┐
│   Error Occurs  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Error Detection │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Error Classification │
│                 │
│ ├─ Network      │
│ ├─ Animation    │
│ ├─ Auth         │
│ ├─ Validation   │
│ └─ Unknown      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Strategy Selection│
│                 │
│ ├─ Retry        │
│ ├─ Fallback     │
│ ├─ User Message │
│ └─ Recovery     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Error Recovery  │
│                 │
│ ├─ Auto Retry   │
│ ├─ Fallback UI  │
│ ├─ User Action  │
│ └─ Logging      │
└─────────────────┘
```

## Performance Monitoring Architecture

### Performance Metrics Collection

```
┌─────────────────────────────────────────────────────────────┐
│                Performance Monitoring                       │
├─────────────────────────────────────────────────────────────┤
│  Metrics Collection                                         │
│  ├── Frame Rate Monitoring                                  │
│  │   ├── requestAnimationFrame tracking                    │
│  │   ├── 60 FPS target validation                          │
│  │   └── Performance degradation detection                │
│  ├── Memory Usage Tracking                                 │
│  │   ├── Heap size monitoring                             │
│  │   ├── DOM node counting                                │
│  │   └── Memory leak detection                           │
│  ├── API Response Time                                     │
│  │   ├── Request timing                                   │
│  │   ├── Response time tracking                           │
│  │   └── Timeout detection                               │
│  └── User Experience Metrics                              │
│      ├── Interaction response time                        │
│      ├── Animation smoothness                             │
│      └── Error rate tracking                              │
├─────────────────────────────────────────────────────────────┤
│  Performance Optimization                                  │
│  ├── Virtualization                                        │
│  │   ├── DOM element limiting                             │
│  │   ├── Render optimization                             │
│  │   └── Memory efficiency                               │
│  ├── Caching Strategy                                      │
│  │   ├── TTL-based caching                               │
│  │   ├── Request deduplication                           │
│  │   └── Cache invalidation                              │
│  └── Animation Optimization                               │
│      ├── Hardware acceleration                           │
│      ├── Smooth easing curves                            │
│      └── Frame rate optimization                         │
└─────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Architecture                    │
├─────────────────────────────────────────────────────────────┤
│  Authentication Layer                                       │
│  ├── User Authentication                                    │
│  │   ├── JWT Token Validation                              │
│  │   ├── Session Management                                │
│  │   └── Token Refresh                                     │
│  ├── Authorization Checks                                   │
│  │   ├── Case Access Validation                            │
│  │   ├── Balance Verification                             │
│  │   └── Permission Checks                                 │
│  └── Security Headers                                      │
│      ├── CORS Configuration                                │
│      ├── CSP Headers                                        │
│      └── Rate Limiting                                      │
├─────────────────────────────────────────────────────────────┤
│  Data Validation Layer                                      │
│  ├── Input Sanitization                                     │
│  │   ├── XSS Prevention                                    │
│  │   ├── SQL Injection Prevention                         │
│  │   └── Data Type Validation                             │
│  ├── Business Logic Validation                             │
│  │   ├── Case Opening Rules                               │
│  │   ├── Balance Checks                                   │
│  │   └── Transaction Validation                           │
│  └── Error Handling                                        │
│      ├── Secure Error Messages                             │
│      ├── Audit Logging                                     │
│      └── Incident Response                                 │
├─────────────────────────────────────────────────────────────┤
│  Transaction Security                                       │
│  ├── Atomic Operations                                      │
│  │   ├── Database Transactions                            │
│  │   ├── Rollback Mechanisms                              │
│  │   └── Consistency Checks                                │
│  ├── Audit Trail                                           │
│  │   ├── Transaction Logging                               │
│  │   ├── User Action Tracking                              │
│  │   └── Security Event Monitoring                         │
│  └── Fraud Prevention                                      │
│      ├── Rate Limiting                                      │
│      ├── Anomaly Detection                                  │
│      └── Suspicious Activity Monitoring                    │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Production Deployment Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging     │    │   Production    │
│                 │    │                 │    │                 │
│ ├─ Feature Dev  │───▶│ ├─ Integration  │───▶│ ├─ Feature Flag │
│ ├─ Unit Tests   │    │ ├─ E2E Tests    │    │ ├─ Gradual Roll│
│ ├─ Code Review  │    │ ├─ Performance  │    │ ├─ Monitoring  │
│ └─ Local Build  │    │ └─ UAT          │    │ └─ Rollback    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │              ┌─────────────────┐
         │                       │              │   Monitoring    │
         │                       │              │                 │
         │                       │              │ ├─ Performance  │
         │                       │              │ ├─ Error Rate   │
         │                       │              │ ├─ User Metrics │
         │                       │              │ └─ Business KPIs│
         │                       │              └─────────────────┘
         │
         ▼
┌─────────────────┐
│   CI/CD Pipeline│
│                 │
│ ├─ Build        │
│ ├─ Test         │
│ ├─ Deploy       │
│ └─ Notify       │
└─────────────────┘
```

## Scalability Considerations

### Horizontal Scaling

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   App Server 1  │    │   App Server 2  │
│                 │    │                 │    │                 │
│ ├─ Health Check │───▶│ ├─ Case Opening │───▶│ ├─ Case Opening │
│ ├─ SSL Term     │    │ ├─ State Mgmt   │    │ ├─ State Mgmt   │
│ ├─ Rate Limit   │    │ ├─ Cache        │    │ ├─ Cache        │
│ └─ Failover     │    │ └─ Monitoring   │    │ └─ Monitoring   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │   Redis Cache   │    │   CDN           │
│                 │    │                 │    │                 │
│ ├─ Read Replicas│    │ ├─ Session Store│    │ ├─ Static Assets│
│ ├─ Write Master │    │ ├─ Case Cache   │    │ ├─ Images       │
│ ├─ Backup       │    │ ├─ Rate Limiting│    │ └─ Animations   │
│ └─ Monitoring   │    │ └─ Pub/Sub      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Maintenance Procedures

### Regular Maintenance Tasks

1. **Performance Monitoring**
   - Daily frame rate analysis
   - Weekly memory usage reports
   - Monthly performance optimization reviews

2. **Error Monitoring**
   - Real-time error rate tracking
   - Daily error log analysis
   - Weekly error pattern reviews

3. **Security Monitoring**
   - Continuous security scanning
   - Daily audit log review
   - Weekly security assessment

4. **Cache Management**
   - Daily cache hit rate analysis
   - Weekly cache invalidation review
   - Monthly cache optimization

### Troubleshooting Procedures

1. **Performance Issues**
   - Check frame rate metrics
   - Analyze memory usage patterns
   - Review animation performance
   - Validate API response times

2. **Error Handling**
   - Review error logs and patterns
   - Check error recovery mechanisms
   - Validate user experience impact
   - Implement fixes and monitoring

3. **State Management Issues**
   - Review state transition logs
   - Check for state inconsistencies
   - Validate error recovery flows
   - Test state reset mechanisms

4. **Animation Issues**
   - Check browser compatibility
   - Validate hardware acceleration
   - Review performance metrics
   - Test fallback mechanisms
