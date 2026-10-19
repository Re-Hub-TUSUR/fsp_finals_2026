package ru.sportikus.sport;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SlugUtilTest {

    @Test
    void transliteratesRussianNames() {
        assertThat(SlugUtil.slugify("Воркаут")).isEqualTo("vorkaut");
        assertThat(SlugUtil.slugify("Настольный теннис")).isEqualTo("nastolnyj-tennis");
        assertThat(SlugUtil.slugify("Шахматы")).isEqualTo("shahmaty");
        assertThat(SlugUtil.slugify("Волейбол")).isEqualTo("volejbol");
        assertThat(SlugUtil.slugify("Танцы")).isEqualTo("tantsy");
        assertThat(SlugUtil.slugify("Лыжи")).isEqualTo("lyzhi");
    }

    @Test
    void normalizesSpacesCaseAndPunctuation() {
        assertThat(SlugUtil.slugify("  Петанк  ")).isEqualTo("petank");
        assertThat(SlugUtil.slugify("ПЕТАНК")).isEqualTo(SlugUtil.slugify("петанк"));
        assertThat(SlugUtil.slugify("Мастер--класс!!")).isEqualTo("master-klass");
        assertThat(SlugUtil.slugify("Падел 2x2")).isEqualTo("padel-2x2");
    }

    @Test
    void returnsEmptyForNameWithoutLetters() {
        assertThat(SlugUtil.slugify("!!!")).isEmpty();
        assertThat(SlugUtil.slugify(null)).isEmpty();
    }
}
