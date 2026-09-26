#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Frank Winter
# SPDX-License-Identifier: MIT
"""
Bereitet ein Release vor: setzt die neue Version, prüft den Code, nimmt die
Handbuch-Screenshots neu auf und baut das Handbuch.

Schritte:
  1. Version eintragen in
       src/js/app.js                  (APP_VERSION, maßgeblich)
       package.json                   ("version")
       docs/handbuch/markpublish.yaml (version: "…")
       CHANGELOG.md                   ("## [Unveröffentlicht]" wird zu "## [<VERSION>] – <Datum>")
  2. npm run check und npm test
  3. Screenshots:  node scripts/capture_screenshots.js
  4. Handbuch:     scripts/build_manual.py (PDF und Weiterleitung unter src/docs/manual/)

Committet, getaggt und veröffentlicht wird nicht; das bleibt Handarbeit.

Aufruf:  python scripts/release.py 1.2.0
         python scripts/release.py 1.2.0 --keine-screenshots
Voraussetzung:  Node.js, Google Chrome, pip install -r docs/handbuch/requirements.txt
"""

from __future__ import annotations

import argparse
import datetime
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import build_manual

ROOT = Path(__file__).resolve().parent.parent
APP_JS = ROOT / "src" / "js" / "app.js"
PACKAGE_JSON = ROOT / "package.json"
MANUAL_CONFIG = ROOT / "docs" / "handbuch" / "markpublish.yaml"
CHANGELOG = ROOT / "CHANGELOG.md"
SCREENSHOTS = ROOT / "scripts" / "capture_screenshots.js"

VERSION_RE = re.compile(r"^\d+\.\d+\.\d+$")
UNRELEASED = "## [Unveröffentlicht]"


def fail(message: str) -> None:
    print(f"Fehler: {message}", file=sys.stderr)
    sys.exit(1)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


# Zeilenenden der Dateien (LF oder CRLF) bleiben erhalten
def read(path: Path) -> str:
    with path.open(encoding="utf-8", newline="") as f:
        return f.read()


def write(path: Path, text: str) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        f.write(text)


def replace_once(path: Path, pattern: str, replacement: str) -> None:
    text, count = re.subn(pattern, replacement, read(path), count=1, flags=re.MULTILINE)
    if count != 1:
        fail(f"Versionseintrag nicht gefunden in {rel(path)}")
    write(path, text)


def version_key(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split("."))


def update_changelog(version: str) -> None:
    text = read(CHANGELOG)
    if f"## [{version}]" in text:
        print(f"  {rel(CHANGELOG)}: Abschnitt [{version}] besteht bereits")
        return
    if UNRELEASED not in text:
        fail(f'{rel(CHANGELOG)} hat keinen Abschnitt "{UNRELEASED}" mit den Änderungen dieser Version')
    today = datetime.date.today().isoformat()
    write(CHANGELOG, text.replace(UNRELEASED, f"## [{version}] – {today}", 1))
    print(f"  {rel(CHANGELOG)}: [Unveröffentlicht] → [{version}] – {today}")


def set_version(version: str) -> None:
    replace_once(APP_JS, r"^(const APP_VERSION = ')[^']*(';)", rf"\g<1>{version}\g<2>")
    print(f"  {rel(APP_JS)}: APP_VERSION = '{version}'")

    replace_once(PACKAGE_JSON, r'^(  "version": ")[^"]*(",)', rf"\g<1>{version}\g<2>")
    print(f"  {rel(PACKAGE_JSON)}: version {version}")

    replace_once(MANUAL_CONFIG, r'^([ \t]*version:[ \t]*")[^"]*(")', rf"\g<1>{version}\g<2>")
    print(f"  {rel(MANUAL_CONFIG)}: version {version}")

    update_changelog(version)


def run(*command: str) -> None:
    executable = shutil.which(command[0])
    if not executable:
        fail(f"{command[0]} wurde nicht gefunden")
    print(f"> {' '.join(command)}", flush=True)
    result = subprocess.run([executable, *command[1:]], cwd=ROOT)
    if result.returncode != 0:
        fail(f"{' '.join(command)} ist fehlgeschlagen (Exit-Code {result.returncode})")


def main() -> None:
    # Umlaute und Pfeile auch in der Windows-Konsole und bei umgeleiteter Ausgabe
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    sys.stderr.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Neue Version setzen, prüfen, Screenshots aufnehmen und Handbuch bauen.")
    parser.add_argument("version", help="neue Version, z. B. 1.2.0")
    parser.add_argument("--keine-screenshots", action="store_true", help="Screenshots nicht neu aufnehmen")
    args = parser.parse_args()

    version = args.version.removeprefix("v")
    if not VERSION_RE.match(version):
        fail(f"„{args.version}“ ist keine Version im Format X.Y.Z")

    current = build_manual.app_version()
    if version_key(version) < version_key(current):
        fail(f"{version} ist älter als die aktuelle Version {current}")

    print(f"\n== 1/4 Version {current} → {version}")
    set_version(version)
    json.loads(read(PACKAGE_JSON))  # package.json muss gültig bleiben

    print("\n== 2/4 Prüfen und testen")
    run("npm", "run", "check")
    run("npm", "test")

    print("\n== 3/4 Screenshots")
    if args.keine_screenshots:
        print("  übersprungen (--keine-screenshots)")
    else:
        run("node", str(SCREENSHOTS))

    print("\n== 4/4 Handbuch")
    build_manual.main()

    print(f"\nVersion {version} ist vorbereitet. Noch zu tun:")
    print("  - Änderungen und neue Screenshots prüfen (git status, git diff)")
    print(f'  - committen, z. B. git commit -am "update version to {version}"')
    print(f"  - Release v{version} auf GitHub veröffentlichen (baut und deployt die Seite)")


if __name__ == "__main__":
    main()
