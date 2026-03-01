package com.keskealsaydim.service;

import com.keskealsaydim.dto.auth.*;
import com.keskealsaydim.dto.user.UserDto;
import com.keskealsaydim.entity.User;
import com.keskealsaydim.entity.UserSession;
import com.keskealsaydim.exception.BadRequestException;
import com.keskealsaydim.repository.UserRepository;
import com.keskealsaydim.repository.UserSessionRepository;
import com.keskealsaydim.security.JwtTokenProvider;
import com.keskealsaydim.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Bu email adresi zaten kayıtlı");
        }

        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .name(request.getName().trim())
                .experienceLevel(request.getExperienceLevel())
                .build();

        user = userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());

        return createAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail().toLowerCase().trim(),
                        request.getPassword()
                )
        );

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new BadRequestException("Kullanıcı bulunamadı"));

        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("User logged in: {}", user.getEmail());
        return createAuthResponse(user);
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        UserSession session = sessionRepository.findValidSession(
                        request.getRefreshToken(),
                        LocalDateTime.now()
                )
                .orElseThrow(() -> new BadRequestException("Geçersiz veya süresi dolmuş refresh token"));

        User user = session.getUser();

        // Revoke old session
        session.setRevokedAt(LocalDateTime.now());
        sessionRepository.save(session);

        log.info("Token refreshed for user: {}", user.getEmail());
        return createAuthResponse(user);
    }

    @Transactional
    public void logout(UUID userId, String refreshToken) {
        sessionRepository.findByRefreshToken(refreshToken)
                .ifPresent(session -> {
                    session.setRevokedAt(LocalDateTime.now());
                    sessionRepository.save(session);
                });
        log.info("User logged out: {}", userId);
    }

    @Transactional
    public void logoutAll(UUID userId) {
        sessionRepository.revokeAllUserSessions(userId, LocalDateTime.now());
        log.info("All sessions revoked for user: {}", userId);
    }

    private AuthResponse createAuthResponse(User user) {
        String accessToken = tokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = tokenProvider.generateRefreshToken(user.getId());

        // Save refresh token session
        UserSession session = UserSession.builder()
                .user(user)
                .refreshToken(refreshToken)
                .expiresAt(LocalDateTime.now().plusSeconds(tokenProvider.getRefreshExpiration() / 1000))
                .build();
        sessionRepository.save(session);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration / 1000)
                .user(UserDto.fromEntity(user))
                .build();
    }
}
