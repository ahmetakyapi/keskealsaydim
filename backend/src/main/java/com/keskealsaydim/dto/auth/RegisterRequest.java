package com.keskealsaydim.dto.auth;

import com.keskealsaydim.entity.enums.ExperienceLevel;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Ad gereklidir")
    @Size(min = 2, max = 100, message = "Ad 2-100 karakter arasında olmalıdır")
    private String name;

    @NotBlank(message = "Email gereklidir")
    @Email(message = "Geçerli bir email adresi giriniz")
    private String email;

    @NotBlank(message = "Şifre gereklidir")
    @Size(min = 6, max = 100, message = "Şifre en az 6 karakter olmalıdır")
    private String password;

    private ExperienceLevel experienceLevel = ExperienceLevel.BEGINNER;
}
