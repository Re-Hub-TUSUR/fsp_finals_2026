"""Собирает документацию Sportikus (docs-zensical/docs) в фирменный PDF формата A4.

Текст берётся только из Markdown; HTML печатает Chrome или Edge в режиме headless.
Диаграммы Mermaid рисуются библиотекой mermaid (скачивается один раз в docs-zensical/.cache/);
если скачать её не удалось, диаграммы остаются исходным кодом.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

import markdown

REPO = Path(__file__).resolve().parents[1]
DOCS = REPO / "docs-zensical" / "docs"
CACHE = REPO / "docs-zensical" / ".cache"
OUT_HTML = CACHE / "sportikus-docs.html"
OUT_PDF = REPO / "sportikus-docs.pdf"
MERMAID_JS = CACHE / "mermaid.min.js"
MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"

BROWSER_CANDIDATES = [
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
]
BROWSER_NAMES = ["google-chrome", "chromium", "chromium-browser", "chrome", "msedge"]


def find_browser() -> Path:
    for candidate in BROWSER_CANDIDATES:
        if candidate.exists():
            return candidate
    for name in BROWSER_NAMES:
        found = shutil.which(name)
        if found:
            return Path(found)
    raise SystemExit("Не найден Chrome или Edge: установите один из них или добавьте путь в BROWSER_CANDIDATES")


# Раздел, исходный файл. Порядок повторяет навигацию в zensical.toml.
CHAPTERS: list[tuple[str, str]] = [
    ("Главная", "index.md"),
    ("Продукт", "product/overview.md"),
    ("Продукт", "product/pages.md"),
    ("Продукт", "actors/personas.md"),
    ("Продукт", "use-cases/index.md"),
    ("Продукт", "use-cases/user.md"),
    ("Продукт", "use-cases/organizer.md"),
    ("Продукт", "use-cases/admin.md"),
    ("Продукт", "user-flows/index.md"),
    ("Бизнес", "business/coverage.md"),
    ("Бизнес", "business/nfr.md"),
    ("Инженерия", "technical/index.md"),
    ("Инженерия", "technical/architecture.md"),
    ("Инженерия", "technical/data-model.md"),
    ("Инженерия", "technical/api.md"),
    ("Инженерия", "technical/constructor.md"),
    ("Инженерия", "technical/recommendations.md"),
    ("Инженерия", "technical/moderation.md"),
    ("Инженерия", "technical/local-start.md"),
    ("Инженерия", "technical/testing.md"),
    ("Инженерия", "technical/limitations.md"),
    ("Глоссарий", "glossary.md"),
]

# Фриз на обложке и над главами: геометрические «спортивные» знаки в тонах бренда. m — мята, f — пламя, w — светлый.
SIGNS: list[list[tuple[str, str]]] = [
    [("●", "m")],
    [("▲", "f")],
    [("■", "w")],
    [("●", "w")],
    [("▲", "m")],
    [("■", "f")],
    [("◆", "m")],
    [("●", "f")],
]


def _esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def frieze(kind: str) -> str:
    parts: list[str] = []
    for _ in range(10):
        for sign in SIGNS:
            glyphs = "".join(f'<span class="{tone}">{_esc(glyph)}</span>' for glyph, tone in sign)
            parts.append(f'<span class="sign">{glyphs}</span>')
    return f'<div class="frieze frieze--{kind}" aria-hidden="true">{"".join(parts)}</div>'


def anchor(rel: str) -> str:
    return rel.removesuffix(".md").replace("/", "-").replace("\\", "-")


def strip_frontmatter(text: str) -> str:
    if text.startswith("---"):
        return re.sub(r"^---\r?\n.*?\r?\n---\r?\n", "", text, count=1, flags=re.S)
    return text


def mermaid_block(body: str) -> str:
    lines = [line.rstrip() for line in body.strip().splitlines() if line.strip()]
    return f'<pre class="mermaid">{_esc(chr(10).join(lines))}</pre>'


def prepare_markdown(text: str, rel: str) -> str:
    text = strip_frontmatter(text)
    text = re.sub(
        r"```mermaid\r?\n(.*?)```",
        lambda m: "\n\n" + mermaid_block(m.group(1)) + "\n\n",
        text,
        flags=re.S,
    )

    def link_sub(match: re.Match[str]) -> str:
        label, href = match.group(1), match.group(2)
        if href.startswith(("http://", "https://", "#", "mailto:")):
            return match.group(0)
        target = href.split("#", 1)[0]
        if not target.endswith(".md"):
            return match.group(0)
        parts: list[str] = []
        for part in (Path(rel).parent / target).as_posix().split("/"):
            if part == "..":
                if parts:
                    parts.pop()
            elif part not in ("", "."):
                parts.append(part)
        return f"[{label}](#{anchor('/'.join(parts))})"

    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link_sub, text)


def _nobr_ids(html: str) -> str:
    def repl(match: re.Match[str]) -> str:
        inner = match.group(1)
        plain = re.sub(r"<[^>]+>", "", inner).strip()
        if len(plain) <= 14 and re.match(r"(UC-|V\d)", plain):
            return f'<td class="id">{inner}</td>'
        return match.group(0)

    return re.sub(r"<td>(.*?)</td>", repl, html, flags=re.S)


def first_heading(html: str, fallback: str) -> str:
    match = re.search(r"<h1[^>]*>(.*?)</h1>", html, flags=re.S)
    if not match:
        return fallback
    return re.sub(r"<[^>]+>", "", match.group(1)).strip()


def render_chapter(section: str, rel: str, *, opens: bool) -> tuple[str, str]:
    source = (DOCS / rel).read_text(encoding="utf-8")
    body = markdown.markdown(
        prepare_markdown(source, rel),
        extensions=["tables", "fenced_code", "sane_lists", "admonition", "attr_list", "md_in_html"],
    )
    body = _nobr_ids(body)
    title = first_heading(body, Path(rel).stem)
    kind = "article opens" if opens else "article"
    html = (
        f'<article class="{kind}" id="{anchor(rel)}">'
        f'<p class="kicker">{_esc(section)}</p>'
        f"{frieze('paper')}"
        f"{body}"
        f"</article>"
    )
    return title, html


def mermaid_script() -> str:
    """Возвращает <script> с mermaid и запуском отрисовки или пустую строку, если библиотеки нет."""
    CACHE.mkdir(parents=True, exist_ok=True)
    if not MERMAID_JS.exists():
        try:
            with urllib.request.urlopen(MERMAID_URL, timeout=60) as response:
                MERMAID_JS.write_bytes(response.read())
        except OSError as error:
            print(f"mermaid не скачан ({error}); диаграммы будут исходным кодом", file=sys.stderr)
            return ""
    library = MERMAID_JS.read_text(encoding="utf-8").replace("</script", "<\\/script")
    init = """
mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  securityLevel: "strict",
  fontFamily: "Segoe UI, Arial, sans-serif",
  flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis", wrappingWidth: 120, nodeSpacing: 30, rankSpacing: 36 },
  sequence: { useMaxWidth: true },
  er: { useMaxWidth: true },
  state: { useMaxWidth: true },
  themeVariables: {
    primaryColor: "#e8fcf4",
    primaryTextColor: "#0e1116",
    primaryBorderColor: "#0bd68a",
    secondaryColor: "#fff0e8",
    tertiaryColor: "#f2f4f7",
    lineColor: "#0e1116",
    textColor: "#0e1116",
    noteBkgColor: "#fff0e8",
    noteTextColor: "#0e1116"
  }
});
mermaid.run({ querySelector: "pre.mermaid" }).catch(function (e) { console.error(e); });
"""
    return f"<script>{library}</script><script>{init}</script>"


CSS = r"""
@page {
  size: A4;
  margin: 16mm 14mm 16mm 14mm;
  @bottom-left {
    content: "Sportikus  ·  Документация";
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 8pt;
    letter-spacing: 0.06em;
    color: #5e6670;
  }
  @bottom-right {
    content: counter(page);
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 9pt;
    font-weight: 700;
    color: #057a50;
  }
}
@page:first {
  margin: 0;
  @bottom-left { content: none; }
  @bottom-right { content: none; }
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  color: #0e1116;
  font-family: "Segoe UI", Arial, sans-serif;
  font-size: 10pt;
  line-height: 1.5;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.cover {
  height: 297mm;
  background: #0e1116;
  color: #f2f4f5;
  padding: 18mm 16mm 16mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  break-after: page;
}
.cover__top, .cover__bottom { flex: none; }
.cover__mid { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.eyebrow {
  margin: 14mm 0 8mm;
  font-size: 10pt;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #9aa0a6;
}
.wordmark {
  margin: 0;
  font-size: 72pt;
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: 0.02em;
  color: #f2f4f5;
}
.cover__rule {
  width: 42mm;
  height: 3px;
  margin: 8mm 0;
  background: #0bd68a;
}
.cover__title {
  margin: 0;
  font-size: 18pt;
  font-weight: 700;
  color: #f2f4f5;
}
.cover__lead {
  max-width: 140mm;
  margin: 6mm 0 0;
  color: #b3b8bd;
  font-size: 11pt;
  line-height: 1.5;
}
.cover__meta {
  margin: 10mm 0 0;
  color: #0bd68a;
  font-size: 9pt;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.frieze {
  display: flex;
  align-items: center;
  gap: 0.7em;
  overflow: hidden;
  white-space: nowrap;
  height: 1.2em;
  font-size: 10pt;
  line-height: 1;
}
.frieze .sign { display: inline-flex; flex: none; }
.frieze--dark .m { color: #0bd68a; }
.frieze--dark .f { color: #ff7a45; }
.frieze--dark .w { color: #f2f4f5; }
.frieze--paper .m { color: #0bd68a; }
.frieze--paper .f { color: #ff7a45; }
.frieze--paper .w { color: #0e1116; }

.toc { break-after: page; }
.toc h1 { margin-top: 4mm; }
.toc ol { list-style: none; margin: 6mm 0 0; padding: 0; }
.toc li { break-inside: avoid; }
.toc a {
  display: flex;
  justify-content: flex-start;
  gap: 8mm;
  padding: 2.2mm 0;
  border-bottom: 1px solid #e3e6ea;
  color: #0e1116;
  text-decoration: none;
  font-weight: 500;
}
.toc .sec {
  color: #057a50;
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  min-width: 28mm;
}

article { margin-top: 9mm; }
article.opens { break-before: page; margin-top: 0; }
article .frieze { margin: 0 0 5mm; }
.kicker {
  margin: 0 0 3mm;
  color: #057a50;
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 6mm;
  font-size: 20pt;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: #0e1116;
}
h2 {
  margin: 7mm 0 2.5mm;
  font-size: 13pt;
  font-weight: 700;
  line-height: 1.3;
  color: #0e1116;
  break-after: avoid;
}
h3 {
  margin: 5mm 0 1.5mm;
  font-size: 11pt;
  font-weight: 700;
  color: #057a50;
  break-after: avoid;
}
p { margin: 0 0 3mm; }
strong { font-weight: 700; }
a { color: #057a50; text-decoration: none; }
ul, ol { margin: 0 0 3.5mm; padding-left: 5mm; }
li { margin: 0.6mm 0; }
li::marker { color: #0bd68a; }

table {
  width: 100%;
  margin: 3mm 0 5mm;
  border-collapse: collapse;
  font-size: 8.5pt;
  line-height: 1.4;
}
th {
  background: #0e1116;
  color: #f2f4f5;
  font-weight: 700;
  text-align: left;
  padding: 2mm 2.2mm;
}
td {
  padding: 1.8mm 2.2mm;
  border-bottom: 1px solid #e3e6ea;
  vertical-align: top;
}
td.id { white-space: nowrap; }
tr { break-inside: avoid; }
tbody tr:nth-child(even) td { background: #f4f5f7; }

code {
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.92em;
  color: #057a50;
  background: #eef2f0;
  padding: 0 0.25em;
}
pre {
  margin: 3mm 0 4mm;
  padding: 3.5mm 4mm;
  background: #0e1116;
  color: #f2f4f5;
  border-left: 3px solid #0bd68a;
  white-space: pre-wrap;
  break-inside: avoid;
}
pre code { color: inherit; background: none; padding: 0; font-size: 8.5pt; }

pre.mermaid[data-processed] {
  margin: 3mm 0 5mm;
  padding: 3mm;
  background: #ffffff;
  border: 1px solid #e3e6ea;
  border-left: 3px solid #0bd68a;
  white-space: normal;
  text-align: center;
}
pre.mermaid svg { max-width: 100%; max-height: 215mm; }

.admonition {
  margin: 3mm 0 5mm;
  padding: 2.5mm 4mm;
  background: #e8fcf4;
  border-left: 3px solid #0bd68a;
  break-inside: avoid;
}
.admonition-title { margin: 0 0 1mm; font-weight: 700; color: #057a50; }
.admonition p:last-child { margin-bottom: 0; }
"""


def build_html() -> str:
    toc: list[str] = []
    chapters: list[str] = []
    opened: set[str] = set()
    for section, rel in CHAPTERS:
        if not (DOCS / rel).exists():
            raise SystemExit(f"нет главы: {rel}")
        title, html = render_chapter(section, rel, opens=section not in opened)
        opened.add(section)
        toc.append(
            "<li>"
            f'<a href="#{anchor(rel)}">'
            f'<span class="sec">{_esc(section)}</span>'
            f"<span>{_esc(title)}</span>"
            "</a></li>"
        )
        chapters.append(html)

    cover = f"""
<section class="cover">
  <div class="cover__top">{frieze("dark")}</div>
  <div class="cover__mid">
    <p class="eyebrow">Финал ФСП · кейс Столото</p>
    <p class="wordmark">SPORTIKUS</p>
    <div class="cover__rule"></div>
    <p class="cover__title">Документация платформы</p>
    <p class="cover__lead">Платформа спортивных активностей: продукт, сценарии, покрытие ТЗ и устройство системы. Текст совпадает с документацией на сайте.</p>
    <p class="cover__meta">2026</p>
  </div>
  <div class="cover__bottom">{frieze("dark")}</div>
</section>
"""
    toc_html = (
        '<section class="toc">'
        '<p class="kicker">Содержание</p>'
        + frieze("paper")
        + "<h1>Содержание</h1><ol>"
        + "".join(toc)
        + "</ol></section>"
    )
    return (
        '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">'
        f"<title>Sportikus — документация</title><style>{CSS}</style></head><body>"
        f"{cover}{toc_html}{''.join(chapters)}{mermaid_script()}</body></html>"
    )


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(build_html(), encoding="utf-8")
    browser = find_browser()
    # Crashpad ещё держит файлы профиля после выхода Chrome: ошибки очистки не важны
    with tempfile.TemporaryDirectory(prefix="sportikus-pdf-", ignore_cleanup_errors=True) as profile:
        subprocess.run(
            [
                str(browser),
                "--headless",
                "--disable-gpu",
                f"--user-data-dir={profile}",
                "--no-pdf-header-footer",
                "--virtual-time-budget=30000",
                f"--print-to-pdf={OUT_PDF}",
                OUT_HTML.as_uri(),
            ],
            check=True,
        )
    print(OUT_PDF)


if __name__ == "__main__":
    sys.exit(main())
