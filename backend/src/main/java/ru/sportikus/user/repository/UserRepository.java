package ru.sportikus.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.sportikus.user.model.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);
}
