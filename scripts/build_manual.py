#!/usr/bin/env python3
"""
Baut das Benutzerhandbuch (docs/handbuch) mit markpublish als PDF.

Ablage: src/docs/manual/grundschutz-explorer-handbuch-v<VERSION>.pdf
Die Version kommt aus APP_VERSION in src/js/app.js und wird für den Build in die
Handbuch-Konfiguration übernommen, damit Deckblatt und Fußzeile dieselbe Version zeigen
wie die App. Die markpublish.yaml selbst bleibt dabei unverändert.

Aufruf:  python scripts/build_manual.py
Voraussetzung:  pip install markpublish
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_JS = ROOT / "src" / "js" / "app.js"
MANUAL_DIR = ROOT / "docs" / "handbuch"
CONFIG = MANUAL_DIR / "markpublish.yaml"
OUT_DIR = ROOT / "src" / "docs" / "manual"
FILE_PREFIX = "grundschutz-explorer-handbuch-v"


def fail(message: str) -> None:
    print(f"Fehler: {message}", file=sys.stderr)
    sys.exit(1)


def app_version() -> str:
    match = re.search(r"^const APP_VERSION = '([^']+)';\s*$", APP_JS.read_text(encoding="utf-8"), re.MULTILINE)
    if not match:
        fail(f"APP_VERSION nicht gefunden in {APP_JS.relative_to(ROOT)}")
    return match.group(1)


def config_with_version(version: str) -> str:
    text = CONFIG.read_text(encoding="utf-8")
    text, count = re.subn(r'^([ \t]*version:[ \t]*)"[^"]*"', rf'\g<1>"{version}"', text, count=1, flags=re.MULTILINE)
    if count != 1:
        fail(f'Eintrag version: "…" nicht gefunden in {CONFIG.relative_to(ROOT)}')
    return text


def main() -> None:
    markpublish = shutil.which("markpublish")
    if not markpublish:
        fail("markpublish ist nicht installiert (pip install markpublish)")

    version = app_version()
    target = OUT_DIR / f"{FILE_PREFIX}{version}.pdf"

    # Temporäre Konfiguration im Handbuch-Verzeichnis, damit relative Pfade und das
    # Projekt-Theme unter templates/ weiterhin gefunden werden
    build_config = MANUAL_DIR / ".markpublish.build.yaml"
    build_config.write_text(config_with_version(version), encoding="utf-8")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob(f"{FILE_PREFIX}*.pdf"):
        old.unlink()

    try:
        subprocess.run(
            [markpublish, "build", str(build_config), "--target", "pdf", "--output", str(target)],
            check=True,
        )
    except subprocess.CalledProcessError as err:
        fail(f"markpublish build ist fehlgeschlagen (Exit-Code {err.returncode})")
    finally:
        build_config.unlink(missing_ok=True)

    if not target.is_file():
        fail(f"PDF wurde nicht erzeugt: {target.relative_to(ROOT)}")
    print(f"Handbuch erzeugt: {target.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
