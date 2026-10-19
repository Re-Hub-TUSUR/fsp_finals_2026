package ru.sportikus.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OrganizationRegistrationRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Pattern(regexp = "\\d{10}|\\d{12}", message = "ИНН должен содержать 10 или 12 цифр") String inn,
        @NotBlank @Pattern(regexp = "\\d{13}|\\d{15}", message = "ОГРН должен содержать 13 или 15 цифр") String ogrn,
        @NotBlank @Pattern(regexp = "\\d{9}", message = "КПП должен содержать 9 цифр") String kpp,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 72) String password
) {
}
