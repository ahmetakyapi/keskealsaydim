package com.keskealsaydim.dto.user;

import com.keskealsaydim.entity.User;
import com.keskealsaydim.entity.enums.ExperienceLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {

    private UUID id;
    private String email;
    private String name;
    private ExperienceLevel experienceLevel;
    private String avatarUrl;
    private Boolean emailVerified;
    private String preferredCurrency;
    private String theme;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;

    public static UserDto fromEntity(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .experienceLevel(user.getExperienceLevel())
                .avatarUrl(user.getAvatarUrl())
                .emailVerified(user.getEmailVerified())
                .preferredCurrency(user.getPreferredCurrency())
                .theme(user.getTheme())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}
