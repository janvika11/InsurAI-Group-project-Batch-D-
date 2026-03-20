package com.insurai.auth.service;

import com.insurai.auth.dto.*;
import com.insurai.auth.entity.RefreshToken;
import com.insurai.auth.entity.Role;
import com.insurai.auth.entity.User;
import com.insurai.auth.repository.RefreshTokenRepository;
import com.insurai.auth.repository.RoleRepository;
import com.insurai.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        if (!user.getIsActive()) throw new RuntimeException("Account is disabled");
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
            throw new RuntimeException("Invalid email or password");

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        RefreshToken rt = RefreshToken.builder()
                .userId(user.getId())
                .token(refreshToken)
                .expiresAt(Instant.now().plusMillis(86400000L * 7))
                .revoked(false)
                .build();
        refreshTokenRepository.save(rt);
        publishAuditEvent("USER_LOGIN", user);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(86400000L)
                .user(toLoginUserDto(user))
                .build();
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new RuntimeException("Email already registered");

        Role role = roleRepository.findByName(request.getRole())
                .orElse(roleRepository.findByName("CUSTOMER").orElseThrow());

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .isActive(true)
                .build();
        user.getRoles().add(role);
        user = userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        RefreshToken rt = RefreshToken.builder()
                .userId(user.getId())
                .token(refreshToken)
                .expiresAt(Instant.now().plusMillis(86400000L * 7))
                .revoked(false)
                .build();
        refreshTokenRepository.save(rt);
        publishAuditEvent("USER_REGISTER", user);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(86400000L)
                .user(toLoginUserDto(user))
                .build();
    }

    public LoginResponse.RefreshResponse refresh(RefreshRequest request) {
        RefreshToken rt = refreshTokenRepository
                .findByTokenAndRevokedFalseAndExpiresAtAfter(request.getRefreshToken(), Instant.now())
                .orElseThrow(() -> new RuntimeException("Invalid or expired refresh token"));

        User user = userRepository.findById(rt.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return LoginResponse.RefreshResponse.builder()
                .accessToken(jwtService.generateAccessToken(user))
                .expiresIn(86400000L)
                .build();
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByTokenAndRevokedFalseAndExpiresAtAfter(refreshToken, Instant.now())
                .ifPresent(rt -> {
                    rt.setRevoked(true);
                    refreshTokenRepository.save(rt);
                });
    }

    public List<UserDto> listUsers() {
        return userRepository.findAll().stream().map(this::toUserDto).collect(Collectors.toList());
    }

    public UserDto getUser(UUID id) {
        return toUserDto(userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found")));
    }

    @Transactional
    public UserDto createUser(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new RuntimeException("Email already registered");

        Role role = roleRepository.findByName(request.getRole())
                .orElse(roleRepository.findByName("CUSTOMER").orElseThrow());

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .isActive(true)
                .build();
        user.getRoles().add(role);
        return toUserDto(userRepository.save(user));
    }

    @Transactional
    public UserDto updateUserRoles(UUID userId, List<String> roleNames) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        user.getRoles().clear();
        roleNames.forEach(name -> roleRepository.findByName(name).ifPresent(user.getRoles()::add));
        return toUserDto(userRepository.save(user));
    }

    private List<String> extractRoleNames(User user) {
        return user.getRoles().stream().map(r -> r.getName()).collect(Collectors.toList());
    }

    private LoginResponse.UserDto toLoginUserDto(User user) {
        return LoginResponse.UserDto.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roles(extractRoleNames(user))
                .build();
    }

    private UserDto toUserDto(User user) {
        return UserDto.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roles(extractRoleNames(user))
                .isActive(user.getIsActive())
                .build();
    }

    private void publishAuditEvent(String eventType, User user) {
        try {
            Map<String, Object> event = new java.util.HashMap<>();
            event.put("eventType", eventType);
            event.put("userId", user.getId().toString());
            event.put("email", user.getEmail());
            event.put("timestamp", Instant.now().toString());
            kafkaTemplate.send("audit-events", event);
        } catch (Exception ignored) {}
    }
}
