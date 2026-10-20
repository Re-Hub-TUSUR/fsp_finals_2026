package ru.sportikus.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.sportikus.common.ApiException;
import ru.sportikus.user.model.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    long countByRole(String role);

    /** Пользователь по id или 404. */
    default User require(Long id) {
        return findById(id).orElseThrow(() -> ApiException.notFound("Пользователь не найден"));
    }
}
