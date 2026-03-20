# auth-service – Cursor Build Instructions

## Overview
JWT issuer service. Handles login, registration, token refresh, user CRUD, role management.

## pom.xml dependencies
```xml
<dependencies>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
  <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency>
  <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-core</artifactId></dependency>
  <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-api</artifactId><version>0.12.3</version></dependency>
  <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-impl</artifactId><version>0.12.3</version></dependency>
  <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-jackson</artifactId><version>0.12.3</version></dependency>
  <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId></dependency>
  <dependency><groupId>org.mapstruct</groupId><artifactId>mapstruct</artifactId><version>1.5.5.Final</version></dependency>
  <dependency><groupId>org.springframework.kafka</groupId><artifactId>spring-kafka</artifactId></dependency>
</dependencies>
```

## application.yml
```yaml
server:
  port: 8081

spring:
  application:
    name: auth-service
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/authdb}
    username: ${SPRING_DATASOURCE_USERNAME:insurai}
    password: ${SPRING_DATASOURCE_PASSWORD:insurai123}
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  flyway:
    enabled: true
    locations: classpath:db/migration

jwt:
  secret: ${JWT_SECRET:insurai-secret-key-change-in-prod}
  expiry-ms: ${JWT_EXPIRY_MS:86400000}        # 24h
  refresh-expiry-ms: ${JWT_REFRESH_EXPIRY_MS:604800000}  # 7d

kafka:
  bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
```

## Database Migrations (Flyway)

### V1__create_users.sql
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,  -- CUSTOMER, UNDERWRITER, CLAIMS_ADJUSTER, ADMIN, AI_ANALYST
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  org_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed roles
INSERT INTO roles (name) VALUES ('CUSTOMER'), ('UNDERWRITER'), ('CLAIMS_ADJUSTER'), ('ADMIN'), ('AI_ANALYST');

-- Seed admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name) 
VALUES ('admin@insurai.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewdBenyfmZMMqJme', 'Aryan Sharma');
```

## Package Structure
```
com.insurai.auth
├── AuthServiceApplication.java
├── config/
│   ├── SecurityConfig.java          # permitAll on /api/auth/**, secure rest
│   ├── JwtConfig.java               # @ConfigurationProperties
│   └── KafkaConfig.java
├── controller/
│   ├── AuthController.java          # /api/auth/login, /register, /refresh, /logout
│   └── UserController.java          # /api/users (ADMIN only)
├── service/
│   ├── AuthService.java
│   ├── JwtService.java              # issue/validate/refresh tokens
│   └── UserService.java
├── repository/
│   ├── UserRepository.java
│   ├── RoleRepository.java
│   └── RefreshTokenRepository.java
├── entity/
│   ├── User.java
│   ├── Role.java
│   └── RefreshToken.java
├── dto/
│   ├── LoginRequest.java            # email, password
│   ├── LoginResponse.java           # accessToken, refreshToken, user info
│   ├── RegisterRequest.java
│   ├── RefreshRequest.java
│   └── UserDto.java
├── security/
│   └── JwtAuthFilter.java           # OncePerRequestFilter
└── exception/
    └── GlobalExceptionHandler.java  # @RestControllerAdvice
```

## REST API Contracts

### POST /api/auth/login
Request:
```json
{ "email": "rahul@company.com", "password": "password123" }
```
Response 200:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 86400000,
  "user": { "id": "uuid", "email": "...", "fullName": "Rahul Mehta", "roles": ["CUSTOMER"] }
}
```

### POST /api/auth/register
Request:
```json
{ "email": "...", "password": "...", "fullName": "...", "role": "CUSTOMER" }
```

### POST /api/auth/refresh
Request: `{ "refreshToken": "eyJ..." }`
Response: `{ "accessToken": "eyJ...", "expiresIn": 86400000 }`

### POST /api/auth/logout
Header: `Authorization: Bearer <token>`
Revokes refresh token.

### GET /api/users (ADMIN only)
Returns list of all users with roles.

### POST /api/users (ADMIN only)
Create user with specified role.

### PUT /api/users/{id}/roles (ADMIN only)
Update user roles.

## JwtService.java key methods
```java
String generateAccessToken(User user);   // includes userId, email, roles[], orgId
String generateRefreshToken(User user);
Claims validateToken(String token);      // throws on invalid/expired
boolean isTokenExpired(String token);
```

## JWT Claims structure
```json
{
  "sub": "user-uuid",
  "email": "user@email.com",
  "roles": ["UNDERWRITER"],
  "orgId": "org-uuid",
  "iat": 1234567890,
  "exp": 1234654290
}
```

## Kafka Producer
Publish to `audit-events` topic on login/logout/register:
```json
{
  "eventType": "USER_LOGIN",
  "userId": "uuid",
  "email": "user@email.com",
  "timestamp": "2025-03-01T09:00:00Z",
  "ipAddress": "..."
}
```
