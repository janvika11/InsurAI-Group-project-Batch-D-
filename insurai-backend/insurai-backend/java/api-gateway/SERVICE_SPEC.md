# api-gateway – Cursor Build Instructions

## Overview
Spring Cloud Gateway. Validates JWT, routes to backend services, enforces rate limiting.

## pom.xml dependencies
```xml
<dependencies>
  <dependency><groupId>org.springframework.cloud</groupId><artifactId>spring-cloud-starter-gateway</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>
  <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-api</artifactId><version>0.12.3</version></dependency>
  <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-impl</artifactId><version>0.12.3</version></dependency>
  <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-jackson</artifactId><version>0.12.3</version></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-redis-reactive</artifactId></dependency>
  <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId></dependency>
</dependencies>
```

## application.yml
```yaml
server:
  port: 8080

spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      routes:
        # Auth – no JWT needed
        - id: auth-service
          uri: ${AUTH_SERVICE_URL:http://localhost:8081}
          predicates: [Path=/api/auth/**]

        # Policy
        - id: policy-service
          uri: ${POLICY_SERVICE_URL:http://localhost:8082}
          predicates: [Path=/api/policies/**]
          filters: [JwtAuthFilter]

        # Workflow
        - id: workflow-service
          uri: ${WORKFLOW_SERVICE_URL:http://localhost:8083}
          predicates: [Path=/api/workflows/**]
          filters: [JwtAuthFilter]

        # Rules
        - id: rules-service
          uri: ${RULES_SERVICE_URL:http://localhost:8084}
          predicates: [Path=/api/rules/**]
          filters: [JwtAuthFilter]

        # Claims
        - id: claims-service
          uri: ${CLAIMS_SERVICE_URL:http://localhost:8085}
          predicates: [Path=/api/claims/**]
          filters: [JwtAuthFilter]

        # Renewal
        - id: renewal-service
          uri: ${RENEWAL_SERVICE_URL:http://localhost:8086}
          predicates: [Path=/api/renewals/**]
          filters: [JwtAuthFilter]

        # Notify
        - id: notify-service
          uri: ${NOTIFY_SERVICE_URL:http://localhost:8087}
          predicates: [Path=/api/notifications/**]
          filters: [JwtAuthFilter]

        # AI Document
        - id: ai-document-service
          uri: ${AI_DOCUMENT_SERVICE_URL:http://localhost:9003}
          predicates: [Path=/api/ai/documents/**]
          filters: [JwtAuthFilter]

        # AI Assistant
        - id: ai-assistant-service
          uri: ${AI_ASSISTANT_SERVICE_URL:http://localhost:9004}
          predicates: [Path=/api/ai/assistant/**]
          filters: [JwtAuthFilter]

        # Users (admin)
        - id: auth-users
          uri: ${AUTH_SERVICE_URL:http://localhost:8081}
          predicates: [Path=/api/users/**]
          filters: [JwtAuthFilter]

  data:
    redis:
      url: ${REDIS_URL:redis://localhost:6379}

jwt:
  secret: ${JWT_SECRET:insurai-secret-key-change-in-prod}
```

## Package Structure
```
com.insurai.gateway
├── GatewayApplication.java
├── config/
│   └── GatewayConfig.java
├── filter/
│   ├── JwtAuthFilter.java           # GlobalFilter — validates JWT, injects headers
│   └── RateLimitFilter.java         # Optional: Redis token bucket
└── util/
    └── JwtUtil.java                 # validate token, extract claims
```

## JwtAuthFilter Logic
```java
// GatewayFilter applied to all protected routes
@Component
public class JwtAuthFilter implements GatewayFilter, Ordered {
    // 1. Extract Authorization header
    // 2. If missing → 401 Unauthorized
    // 3. Parse JWT with jjwt (same secret as auth-service)
    // 4. If expired/invalid → 401
    // 5. Extract claims: sub (userId), roles[], orgId
    // 6. Mutate request: add headers
    //    X-User-Id: {userId}
    //    X-Roles: CUSTOMER,UNDERWRITER  (comma-separated)
    //    X-Org-Id: {orgId}
    //    X-User-Email: {email}
    // 7. Remove original Authorization header from downstream (optional)
    // 8. Forward mutated request
}
```

## CORS Configuration
Allow:
- Origins: http://localhost:3000, http://localhost:5173 (frontend dev)
- Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Headers: Authorization, Content-Type, X-User-Id
- Credentials: true

## Rate Limiting (Redis)
- 100 requests/minute per IP for public routes
- 500 requests/minute per user for authenticated routes

## Health Check
GET /actuator/health → 200 OK (used by Docker healthcheck)
