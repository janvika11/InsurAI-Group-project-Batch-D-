# Java Service Boilerplate – Copy for Each Service

## Dockerfile (same for all Java services, change APP_NAME and PORT)
```dockerfile
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
ARG APP_NAME=service
ARG PORT=8080
COPY --from=build /app/target/*.jar app.jar
EXPOSE ${PORT}
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## pom.xml parent (Spring Boot 3.2 + Spring Cloud 2023)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.3</version>
  </parent>

  <groupId>com.insurai</groupId>
  <artifactId>REPLACE_SERVICE_NAME</artifactId>
  <version>1.0.0-SNAPSHOT</version>

  <properties>
    <java.version>21</java.version>
    <spring-cloud.version>2023.0.0</spring-cloud.version>
    <mapstruct.version>1.5.5.Final</mapstruct.version>
    <jjwt.version>0.12.3</jjwt.version>
  </properties>

  <dependencies>
    <!-- Web -->
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>

    <!-- Data -->
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
    <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>
    <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-core</artifactId></dependency>

    <!-- Kafka -->
    <dependency><groupId>org.springframework.kafka</groupId><artifactId>spring-kafka</artifactId></dependency>

    <!-- Utils -->
    <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><optional>true</optional></dependency>
    <dependency><groupId>org.mapstruct</groupId><artifactId>mapstruct</artifactId><version>${mapstruct.version}</version></dependency>

    <!-- Test -->
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
    <dependency><groupId>org.springframework.kafka</groupId><artifactId>spring-kafka-test</artifactId><scope>test</scope></dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <configuration>
          <excludes><exclude><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId></exclude></excludes>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <configuration>
          <annotationProcessorPaths>
            <path><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId></path>
            <path><groupId>org.mapstruct</groupId><artifactId>mapstruct-processor</artifactId><version>${mapstruct.version}</version></path>
          </annotationProcessorPaths>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

---

## Global Exception Handler (copy to every service)
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(404).body(ErrorResponse.of("RESOURCE_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(ErrorResponse.of("VALIDATION_ERROR", message));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccess(AccessDeniedException ex) {
        return ResponseEntity.status(403).body(ErrorResponse.of("ACCESS_DENIED", "Insufficient permissions"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleAll(Exception ex) {
        return ResponseEntity.status(500).body(ErrorResponse.of("INTERNAL_ERROR", "An unexpected error occurred"));
    }

    @Data @AllArgsConstructor(staticName = "of")
    public static class ErrorResponse {
        private String error;
        private String message;
        private Instant timestamp = Instant.now();
        
        public static ErrorResponse of(String error, String message) {
            return new ErrorResponse(error, message, Instant.now());
        }
    }
}
```

---

## SecurityConfig template (for backend services — trust gateway headers)
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(gatewayHeaderFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    // Filter: reads X-User-Id, X-Roles from Gateway, sets SecurityContext
    @Bean
    public GatewayHeaderAuthFilter gatewayHeaderFilter() {
        return new GatewayHeaderAuthFilter();
    }
}
```

## GatewayHeaderAuthFilter
```java
@Component
public class GatewayHeaderAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        
        String userId = req.getHeader("X-User-Id");
        String rolesHeader = req.getHeader("X-Roles");
        
        if (userId != null && rolesHeader != null) {
            List<GrantedAuthority> authorities = Arrays.stream(rolesHeader.split(","))
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.trim()))
                .collect(Collectors.toList());
            
            UsernamePasswordAuthenticationToken auth = 
                new UsernamePasswordAuthenticationToken(userId, null, authorities);
            auth.setDetails(Map.of(
                "userId", userId,
                "email", Optional.ofNullable(req.getHeader("X-User-Email")).orElse(""),
                "orgId", Optional.ofNullable(req.getHeader("X-Org-Id")).orElse("")
            ));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        
        chain.doFilter(req, res);
    }
}
```

## Helper: get current user in controller/service
```java
@Component
public class CurrentUserHelper {
    public String getCurrentUserId() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
    public List<String> getCurrentRoles() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
            .map(a -> a.getAuthority().replace("ROLE_", ""))
            .collect(Collectors.toList());
    }
}
```

