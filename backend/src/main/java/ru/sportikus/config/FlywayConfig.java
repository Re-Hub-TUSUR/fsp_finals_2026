package ru.sportikus.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {

    /**
     * Перед миграцией выравниваем контрольные суммы уже применённых скриптов.
     * V9 исправлен задним числом (демо-уведомления из него переехали в R__demo_data, иначе чистая база
     * не мигрировала) — без repair() уже развёрнутые базы не стартовали бы с ошибкой checksum mismatch.
     */
    @Bean
    public FlywayMigrationStrategy repairThenMigrate() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
