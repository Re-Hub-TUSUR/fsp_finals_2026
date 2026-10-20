# Документация Sportikus

Документация платформы **Sportikus**: продукт, сценарии, покрытие ТЗ и устройство системы. Сайт собирается генератором [Zensical](https://zensical.org) из Markdown в `docs/`, настройки — в `zensical.toml`.

Нормативное поведение продукта описано в разделах «Продукт» и «Бизнес». Раздел «Инженерия» описывает текущую реализацию и не переопределяет их.

## Локальный сайт

Из этого каталога, без Docker:

```bash
python -m venv .venv
.venv\Scripts\activate        # Linux и macOS: source .venv/bin/activate
pip install -r requirements.txt
zensical serve                # http://localhost:8000
```

Статическая сборка:

```bash
zensical build --clean
```

Результат — в `site/` (в git не попадает).

## В Docker

```bash
docker build -t sportikus-docs docs-zensical
docker run --rm -p 8081:80 sportikus-docs
```

Сайт откроется на `http://localhost:8081`. Образ собирает статику и раздаёт её через nginx; к API он не обращается.

## PDF

Фирменный PDF формата A4 из тех же Markdown-файлов: из корня репозитория

```bash
python scripts/build_pdf.py
```

Скрипт собирает HTML (`docs-zensical/.cache/sportikus-docs.html`) и печатает его в `sportikus-docs.pdf` в корне через Chrome или Edge в режиме headless. Нужны Python 3.12+, пакет `markdown` (`pip install -r docs-zensical/requirements.txt`) и установленный Chrome или Edge. Диаграммы Mermaid отрисовываются библиотекой `mermaid`, которая один раз скачивается в `docs-zensical/.cache/`; если скачать не удалось, диаграммы выводятся исходным кодом.

Текст PDF берётся только из Markdown — править нужно файлы в `docs/`, а порядок глав PDF задан списком `CHAPTERS` в `scripts/build_pdf.py` (он повторяет навигацию из `zensical.toml`).

## Структура

```text
docs-zensical/
├── zensical.toml     # навигация, тема, расширения Markdown
├── requirements.txt  # версии zensical и markdown
├── Dockerfile        # сборка статики и nginx
├── nginx.conf
└── docs/
    ├── index.md
    ├── product/      # обзор и карта страниц
    ├── actors/       # роли и демо-аккаунты
    ├── use-cases/    # сценарии по ролям
    ├── user-flows/   # пошаговые пути и 6 сценариев ТЗ
    ├── business/     # покрытие ТЗ, нефункциональные требования
    ├── technical/    # архитектура, клиент, данные, API, запуск, тесты
    └── glossary.md
```
