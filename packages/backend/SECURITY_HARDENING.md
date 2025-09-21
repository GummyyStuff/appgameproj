# Security Hardening Implementation

This document outlines the comprehensive security hardening measures implemented for the Tarkov Casino backend application.

## Overview

The security hardening implementation addresses the following key areas:
- Rate limiting for game actions and API endpoints
- Enhanced input validation and sanitization
- Comprehensive audit logging for administrative actions
- Session timeout and security headers
- IP-based security monitoring and blocking

## Implementation Details

### 1. Rate Limiting (`middleware/rate-limit.ts`)

#### Features
- **Configurable rate limits** per endpoint type
- **IP and user-based tracking** with automatic cleanup
- **Progressive blocking** with escalating timeouts
- **Comprehensive logging** of rate limit violations

#### Rate Limit Configurations
- **Authentication endpoints**: 5 attempts per 15 minutes, 30-minute block
- **Game actions**: 30 actions per minute, 2-minute block
- **General API**: 100 requests per 15 minutes, 10-minute block
- **Sensitive operations**: 3 attempts per hour, 1-hour block

#### Usage Example
```typescript
import { authRateLimit, gameRateLimit, apiRateLimit } from '../middleware/rate-limit'

// Apply to authentication routes
authRoutes.post('/login', authRateLimit, loginHandler)

// Apply to game routes
gameRoutes.post('/roulette/bet', gameRateLimit, rouletteHandler)

// Apply to general API routes
app.use('/api/*', apiRateLimit)
```

### 2. Input Validation and Sanitization (`middleware/validation.ts`)

#### Security Features
- **Automatic input sanitization** removing dangerous characters
- **Threat detection** for SQL injection, XSS, path traversal, and command injection
- **Content-type validation** ensuring only allowed media types
- **Request size limits** preventing DoS attacks
- **Comprehensive logging** of security threats

#### Sanitization Functions
- `sanitizeString()`: Removes control characters and limits length
- `escapeHtml()`: Escapes HTML entities to prevent XSS
- `sanitizeEmail()`: Normalizes and validates email addresses
- `sanitizeUsername()`: Removes special characters from usernames
- `sanitizeObject()`: Recursively sanitizes object properties

#### Threat Detection Patterns
- **SQL Injection**: Detects SQL keywords, operators, and injection patterns
- **XSS**: Identifies script tags, event handlers, and JavaScript URLs
- **Path Traversal**: Catches directory traversal attempts
- **Command Injection**: Detects shell metacharacters and operators

#### Usage Example
```typescript
import { validationMiddleware, commonSchemas } from '../middleware/validation'

const loginSchema = z.object({
  email: commonSchemas.email,
  password: commonSchemas.password
})

authRoutes.post('/login', validationMiddleware(loginSchema), loginHandler)
```

### 3. Audit Logging (`middleware/audit.ts`)

#### Comprehensive Logging
- **Database storage** in dedicated `audit_logs` table
- **Structured logging** with consistent format
- **Automatic triggers** for critical table changes
- **Security event correlation** with real-time monitoring

#### Audit Log Schema
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB
);
```

#### Audit Functions
- **Authentication events**: Login, logout, registration, password changes
- **Game actions**: Game starts, completions, bet placements
- **Currency operations**: Balance changes, transactions
- **Administrative actions**: Profile updates, system changes
- **Security events**: Rate limit violations, threat detections

#### Usage Example
```typescript
import { auditLog } from '../middleware/audit'

// Manual audit logging
await auditLog.userLoggedIn(userId, email, ipAddress)
await auditLog.gameCompleted(userId, 'roulette', betAmount, winAmount, ipAddress)

// Automatic audit middleware
authRoutes.post('/login', auditAuth('user_login'), loginHandler)
gameRoutes.post('/roulette/bet', auditGame('roulette_bet'), rouletteHandler)
```

### 4. Session Management and Security Headers (`middleware/security.ts`)

#### Session Management
- **Automatic session tracking** with configurable timeouts
- **Activity-based expiration** preventing idle session abuse
- **Multi-session support** with user session management
- **Graceful cleanup** of expired sessions

#### Security Headers
- **Content Security Policy (CSP)**: Prevents XSS and code injection
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-XSS-Protection**: Enables browser XSS filtering
- **Strict-Transport-Security**: Enforces HTTPS in production
- **Referrer-Policy**: Controls referrer information leakage

#### IP Security Management
- **Violation tracking** with automatic blocking
- **Progressive penalties** for repeated violations
- **Automatic cleanup** of old violation records
- **Configurable thresholds** and block durations

#### Usage Example
```typescript
import { 
  securityHeadersMiddleware, 
  sessionTimeoutMiddleware, 
  ipSecurityMiddleware 
} from '../middleware/security'

// Apply security middleware
app.use('*', securityHeadersMiddleware())
app.use('*', ipSecurityMiddleware())
app.use('*', sessionTimeoutMiddleware())
```

## Database Security Features

### Audit Log Functions

#### Cleanup Function
```sql
-- Removes audit logs older than 2 years (configurable retention)
SELECT cleanup_old_audit_logs();
```

#### Statistics Function
```sql
-- Get audit statistics for analysis
SELECT * FROM get_audit_statistics('2024-01-01', '2024-12-31');
```

#### Suspicious Activity Detection
```sql
-- Detect suspicious patterns in user activity
SELECT * FROM detect_suspicious_activity(24); -- Last 24 hours
```

### Row Level Security (RLS)
- **Audit logs**: Only accessible by service role
- **User audit summary**: Users can only see their own audit events
- **Automatic triggers**: Log changes to critical tables

## Security Configuration

### Environment Variables
```env
# Rate limiting configuration
RATE_LIMIT_WINDOW=900000          # 15 minutes
RATE_LIMIT_MAX=100                # Max requests per window
REQUEST_TIMEOUT=30000             # 30 seconds

# Security logging
ENABLE_SECURITY_LOGGING=true
ENABLE_REQUEST_LOGGING=true
LOG_LEVEL=info

# Session management
SESSION_MAX_AGE=86400000          # 24 hours
SESSION_IDLE_TIMEOUT=7200000      # 2 hours
```

### Middleware Stack Order
```typescript
// Security middleware applied in order
app.use('*', securityHeadersMiddleware())      // 1. Security headers
app.use('*', ipSecurityMiddleware())           // 2. IP blocking
app.use('*', requestTimeoutMiddleware())       // 3. Request timeout
app.use('*', validateContentType())            // 4. Content validation
app.use('*', validateRequestSize())            // 5. Size validation
app.use('*', sessionTimeoutMiddleware())       // 6. Session management
app.use('/api/*', apiRateLimit)                // 7. API rate limiting
```

## Testing

### Security Test Coverage
- **Input sanitization**: Tests for all sanitization functions
- **Threat detection**: Comprehensive pattern matching tests
- **Rate limiting**: Functional tests with various scenarios
- **Session management**: Timeout and validation tests
- **Integration tests**: Full security pipeline validation

### Running Security Tests
```bash
# Run standalone security tests
bun test src/test-utils/security-standalone.test.ts --run

# Run all security-related tests
bun test --grep "security" --run
```

## Monitoring and Alerting

### Security Events Logged
- **Rate limit violations**: IP, user, endpoint, and frequency
- **Input validation failures**: Threat types and patterns detected
- **Authentication failures**: Failed login attempts and patterns
- **Session anomalies**: Unusual session patterns or violations
- **IP blocking events**: Automatic blocks and violation thresholds

### Audit Log Analysis
```sql
-- Recent security events
SELECT * FROM audit_logs 
WHERE action LIKE '%security%' 
ORDER BY timestamp DESC 
LIMIT 100;

-- Failed authentication attempts
SELECT ip_address, COUNT(*) as attempts
FROM audit_logs 
WHERE action = 'user_login' AND success = false
AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
ORDER BY attempts DESC;

-- Suspicious activity patterns
SELECT * FROM detect_suspicious_activity(24)
WHERE risk_score > 50;
```

## Security Best Practices

### Input Handling
1. **Always sanitize** user input before processing
2. **Use validation schemas** with Zod for type safety
3. **Apply threat detection** to catch malicious patterns
4. **Log security events** for monitoring and analysis

### Rate Limiting
1. **Apply appropriate limits** based on endpoint sensitivity
2. **Use progressive blocking** to deter persistent attackers
3. **Monitor rate limit violations** for attack patterns
4. **Adjust limits** based on legitimate usage patterns

### Session Management
1. **Implement session timeouts** to prevent session hijacking
2. **Track session activity** to detect anomalies
3. **Provide session management** tools for users
4. **Log session events** for security monitoring

### Audit Logging
1. **Log all security-relevant events** comprehensively
2. **Include contextual information** (IP, user agent, etc.)
3. **Implement log retention policies** for compliance
4. **Regular log analysis** for threat detection

## Compliance and Standards

### Security Standards Addressed
- **OWASP Top 10**: Protection against common web vulnerabilities
- **Input validation**: Comprehensive sanitization and validation
- **Session management**: Secure session handling and timeouts
- **Logging and monitoring**: Comprehensive audit trails
- **Rate limiting**: Protection against abuse and DoS attacks

### Data Protection
- **PII sanitization**: Automatic removal of sensitive data
- **Audit log protection**: RLS policies and access controls
- **Retention policies**: Automatic cleanup of old audit data
- **Access logging**: Complete audit trail of data access

## Deployment Considerations

### Production Security
- **HTTPS enforcement**: Strict transport security headers
- **Environment separation**: Different rate limits for environments
- **Monitoring integration**: Connect audit logs to monitoring systems
- **Backup and recovery**: Secure backup of audit logs

### Performance Impact
- **Minimal overhead**: Efficient middleware implementation
- **Automatic cleanup**: Prevents database bloat
- **Indexed queries**: Optimized database performance
- **Configurable limits**: Adjustable based on capacity

## Maintenance and Updates

### Regular Tasks
1. **Review audit logs** for security patterns
2. **Update threat detection patterns** as needed
3. **Adjust rate limits** based on usage patterns
4. **Clean up old audit data** according to retention policy
5. **Monitor security metrics** and adjust thresholds

### Security Updates
1. **Keep dependencies updated** for security patches
2. **Review and update** threat detection patterns
3. **Test security measures** regularly
4. **Update documentation** as features evolve
5. **Conduct security reviews** periodically

## Conclusion

This comprehensive security hardening implementation provides multiple layers of protection against common web application vulnerabilities and attacks. The combination of rate limiting, input validation, audit logging, and session management creates a robust security posture that protects both the application and its users.

The implementation is designed to be:
- **Comprehensive**: Covers all major security concerns
- **Configurable**: Adaptable to different environments and requirements
- **Performant**: Minimal impact on application performance
- **Maintainable**: Clear structure and comprehensive documentation
- **Compliant**: Addresses industry security standards and best practices