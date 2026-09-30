#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Frank Winter
# SPDX-License-Identifier: MIT
"""
Baut ein Dokument mit markpublish, z. B. ein Handbuch als PDF. Allgemein verwendbar.

Die Version kommt aus dem ersten Eintrag von [version].files und wird nur für den Build in die
markpublish-Konfiguration übernommen (version: "…"), damit Deckblatt und Fußzeile dieselbe Version zeigen; die
Konfiguration selbst bleibt unverändert. Ältere Ausgaben mit demselben Präfix werden entfernt.

Konfiguration [markpublish]:
  config       Pfad der markpublish-Konfiguration
  output_dir   Zielordner
  file_prefix  Dateiname vor der Version, z. B. "handbuch-v" → handbuch-v1.2.0.pdf
  target       markpublish-Ziel (Standard: "pdf"; zugleich Dateiendung)

Aufruf:  python scripts/release/steps/70-markpublish.py
Voraussetzung:  pip install markpublish
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lib.common import current_version, fail, info, load_step, read  # noqa: E402


def config_with_version(config: Path, version: str) -> str:
    text, count = re.subn(r'^([ \t]*version:[ \t]*)"[^"]*"', rf'\g<1>"{version}"', read(config), count=1, flags=re.MULTILINE)
    if count != 1:
        fail(f'Eintrag version: "…" nicht gefunden in {config.name}')
    return text


def main() -> None:
    step = load_step(__file__, "Dokument mit markpublish bauen.")
    markpublish = shutil.which("markpublish")
    if not markpublish:
        fail("markpublish ist nicht installiert (pip install markpublish)")

    config = step.path(step.require("config"))
    out_dir = step.path(step.require("output_dir"))
    prefix = step.require("file_prefix")
    target_kind = step.get("target", "pdf")
    version = current_version(step)
    target = out_dir / f"{prefix}{version}.{target_kind}"

    # Temporäre Konfiguration neben der echten, damit relative Pfade und Vorlagen weiterhin gefunden werden
    build_config = config.with_name(f".{config.stem}.build{config.suffix}")
    build_config.write_text(config_with_version(config, version), encoding="utf-8")

    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob(f"{prefix}*.{target_kind}"):
        old.unlink()

    try:
        subprocess.run(
            [markpublish, "build", str(build_config), "--target", target_kind, "--output", str(target)],
            check=True,
        )
    except subprocess.CalledProcessError as err:
        fail(f"markpublish build ist fehlgeschlagen (Exit-Code {err.returncode})")
    finally:
        build_config.unlink(missing_ok=True)

    if not target.is_file():
        fail(f"Ausgabe wurde nicht erzeugt: {step.rel(target)}")
    info(f"erzeugt: {step.rel(target)}")


if __name__ == "__main__":
    main()
