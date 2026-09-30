#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Frank Winter
# SPDX-License-Identifier: MIT
"""
Legt eine HTML-Seite an, die auf eine Datei weiterleitet. Allgemein verwendbar.

Gedacht für versionierte Ausgaben: Eine feste Adresse (z. B. /manual/) zeigt so immer auf die aktuelle Datei
(z. B. handbuch-v1.2.0.pdf), ohne dass diese doppelt abgelegt wird. Die Zieldatei muss existieren.

Konfiguration [redirect]:
  dir        Ordner der Weiterleitung und der Zieldatei
  target     Dateiname des Ziels; {version} wird durch die aktuelle Version ersetzt
             (erster Eintrag von [version].files)
  file       Name der Weiterleitung (Standard: index.html)
  lang       Sprache der Seite (Standard: "de")
  title      Seitentitel (Standard: Name des Ziels)
  link_text  Text des Links für Browser ohne automatische Weiterleitung (Standard: Name des Ziels)

Aufruf:  python scripts/release/steps/80-redirect.py
"""

from __future__ import annotations

import html
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lib.common import current_version, fail, info, load_step  # noqa: E402


def main() -> None:
    step = load_step(__file__, "Weiterleitung auf eine Datei anlegen.")
    directory = step.path(step.require("dir"))
    template = step.require("target")
    target = template.format(version=current_version(step)) if "{version}" in template else template
    if not (directory / target).is_file():
        fail(f"Zieldatei nicht gefunden: {step.rel(directory / target)}")
    page = directory / step.get("file", "index.html")

    name = html.escape(target)
    page.write_text(
        f"""<!DOCTYPE html>
<!-- Vom Release-Schritt redirect erzeugt, nicht von Hand bearbeiten -->
<html lang="{html.escape(step.get("lang", "de"))}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url={name}" />
  <link rel="canonical" href="{name}" />
  <meta name="robots" content="noindex" />
  <title>{html.escape(step.get("title", target))}</title>
</head>
<body>
  <p><a href="{name}">{html.escape(step.get("link_text", target))}</a></p>
</body>
</html>
""",
        encoding="utf-8",
        newline="\n",
    )
    info(f"{step.rel(page)} → {target}")


if __name__ == "__main__":
    main()
