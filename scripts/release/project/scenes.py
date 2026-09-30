# SPDX-FileCopyrightText: 2026 Frank Winter
# SPDX-License-Identifier: MIT
"""
Szenen für die Screenshots (projektspezifisch, für steps/50-screenshots.py).

Eine Szene stellt einen Zustand der App her und liefert den Ausschnitt als PNG. Jede Szene beginnt in einem
frischen Browserkontext, schreibt ihre Testdaten direkt in die IndexedDB der App (über js/storage.js), lädt neu
und bringt die App dann – wo nötig – über ihre eigenen Funktionen (Wurzelkomponente an #app) in den gewünschten
Zustand. Welche Szenen in welche Datei gehen, legen die Manifeste fest.

  Handbuch  Szenen ohne Präfix, Ansicht 1440 × 900 bei doppelter Pixeldichte
  Website   Szenen mit Präfix website-, eigene Ansichtsgrößen und Beispieldaten

Die Szenen nutzen Speicherstruktur, Einstellungsschlüssel, Funktionen der Wurzelkomponente und CSS-Selektoren
der App. Ändern sich diese, müssen sie angepasst werden.
"""

from __future__ import annotations

import json
import math
from contextlib import contextmanager

from lib.browser import clip
from project.testdata import build_comparison_catalog, load_base_catalog

CATALOG_ID = "bsi-base"
COMPARISON_ID = "test-vergleich"
LIST_AUDIT = "list-audit"
LIST_DEV = "list-team"

CATALOG_RECORD = {
    "id": CATALOG_ID,
    "title": "Anwenderkatalog Grundschutz++",
    "version": "2026-09-10",
    "sourceType": "official",
    "sourceName": "BSI Stand-der-Technik-Bibliothek",
    "importedAt": "2026-09-24T10:00:00.000Z",
}
COMPARISON_RECORD = {
    "id": COMPARISON_ID,
    "title": "Anwenderkatalog Grundschutz++ (Vergleichsversion)",
    "version": "2026.2-Testvergleich",
    "sourceType": "file",
    "sourceName": "Grundschutz++-vergleich_catalog.json",
    "importedAt": "2026-09-25T20:00:00.000Z",
}

_WRITE_DB = """async ({ records, lists, entries, settings }) => {
  const s = await import('./js/storage.js');
  await s.clearAllData();
  for (const r of records) await s.saveCatalogRecord(r);
  if (lists.length) await s.saveListData(lists, entries);
  for (const [key, value] of Object.entries(settings)) await s.saveSetting(key, value);
}"""


def setup(step) -> dict:
    base = load_base_catalog(step.root)
    records = [
        {**CATALOG_RECORD, "catalogData": base},
        {**COMPARISON_RECORD, "catalogData": build_comparison_catalog(base)},
    ]
    return {"handbuch": _handbuch_data(records), "website": _website_data(records)}


def _handbuch_data(records) -> dict:
    return {
        "records": records,
        "lists": [
            {"id": LIST_AUDIT, "name": "Audit 2026", "createdAt": "2026-09-25T12:00:00.000Z"},
            {"id": LIST_DEV, "name": "Entwicklungsteam", "createdAt": "2026-09-25T14:00:00.000Z"},
        ],
        "entries": [
            {
                "key": f"{LIST_AUDIT}|DEV.3.4",
                "listId": LIST_AUDIT,
                "controlId": "DEV.3.4",
                "note": "Passwort-Hashing nach BSI TR-02102 auf Argon2id umstellen. Salt mindestens 128 Bit Zufallswert.",
                "updatedAt": "2026-09-25T15:30:00.000Z",
            },
            {
                "key": f"{LIST_DEV}|DEV.4.3",
                "listId": LIST_DEV,
                "controlId": "DEV.4.3",
                "note": "Prüfen, ob SBOM im CI/CD-Build automatisiert erzeugt und digital signiert wird.",
                "updatedAt": "2026-09-25T16:00:00.000Z",
            },
        ],
        "settings": {
            "last_active_catalog_id": CATALOG_ID,
            "comparison_catalog_id": "",
            "active_list_id": LIST_AUDIT,
            "dark_mode": False,
            "high_contrast": False,
            "font_scale": 1,
            # Breitere Detailansicht, damit Pfadleiste und Reiter in den Ausschnitten nicht umbrechen
            "detail_pane_width": 40,
        },
    }


def _website_data(records) -> dict:
    created = "2026-09-01T08:00:00.000Z"
    note_time = "2026-09-25T15:30:00.000Z"  # 17:30 Uhr in Europe/Berlin
    return {
        "records": records,
        "lists": [
            {"id": LIST_AUDIT, "name": "Audit 2026", "createdAt": created, "updatedAt": created},
            {"id": LIST_DEV, "name": "Entwicklungsteam", "createdAt": created, "updatedAt": created},
        ],
        "entries": [
            {
                "key": f"{LIST_AUDIT}|DEV.3.4",
                "listId": LIST_AUDIT,
                "controlId": "DEV.3.4",
                "note": "Passwort-Hashing nach BSI TR-02102 auf Argon2id umstellen.\nSalt mindestens 128 Bit Zufallswert.",
                "createdAt": created,
                "updatedAt": note_time,
            },
            {
                "key": f"{LIST_DEV}|DEV.4.3",
                "listId": LIST_DEV,
                "controlId": "DEV.4.3",
                "note": "SBOM-Erzeugung in die CI-Pipeline aufnehmen.",
                "createdAt": created,
                "updatedAt": note_time,
            },
        ],
        "settings": {
            "last_active_catalog_id": CATALOG_ID,
            "comparison_catalog_id": "",
            "active_list_id": LIST_AUDIT,
            "dark_mode": False,
            "high_contrast": False,
            "font_scale": 1,
        },
    }


# ---------- Seite ----------


class Page:
    """Hilfen rund um eine Seite: warten, messen, die App steuern, aufnehmen."""

    def __init__(self, page):
        self.page = page

    def js(self, expression, arg=None):
        return self.page.evaluate(expression, arg)

    def wait(self, ms):
        self.page.wait_for_timeout(ms)

    def wait_for(self, expression, timeout=12000):
        self.page.wait_for_function(expression, timeout=timeout)

    def shot(self, region=None, *, rounded=True):
        """Aufnahme der Seite oder eines Ausschnitts; rounded=False übergibt den Ausschnitt ungerundet."""
        self.js("document.documentElement.classList.remove('dark', 'contrast')")
        if not region:
            return self.page.screenshot()
        box = clip(**region) if rounded else region
        return self.page.screenshot(clip=box)

    def rect(self, selector):
        return self.js(
            """(selector) => {
              const el = document.querySelector(selector);
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return { x: r.left, y: r.top, width: r.width, height: r.height };
            }""",
            selector,
        )

    def box(self, selector):
        b = self.page.locator(selector).first.bounding_box()
        if not b:
            raise RuntimeError(f"Element nicht sichtbar: {selector}")
        return b

    # Unterkante eines Elements (CSS-Pixel); das Element liefert ein JS-Ausdruck
    def bottom_of(self, expression):
        return self.js(f"(() => {{ const el = {expression}; return el ? el.getBoundingClientRect().bottom : null; }})()")

    # Die App über ihre eigenen Funktionen steuern, statt sich durch den Baum zu klicken: robuster gegenüber
    # Änderungen am Markup
    def act(self, code):
        err = self.js(
            "(async () => { try { const vm = document.getElementById('app')._vnode.component.proxy; "
            + code
            + "; } catch (e) { return String(e); } })()"
        )
        if err:
            raise RuntimeError(f"App-Aufruf fehlgeschlagen: {err}")

    def set_viewport(self, width, height):
        self.page.set_viewport_size({"width": width, "height": height})

    # Anforderung auswählen und Reiter öffnen
    def show_control(self, id_, tab="overview"):
        self.act(
            f"vm.selectControl(vm.activeCatalog.controlMap.get({json.dumps(id_)})); vm.detailActiveTab = {json.dumps(tab)}"
        )
        self.wait_for(
            f"document.querySelector('.detail-id')?.textContent.trim() === {json.dumps(id_)} && document.querySelector('#tab-{tab}.on')"
        )
        self.wait(350)

    # Liste so scrollen, dass ein Element direkt unter der mitlaufenden Kopfzeile steht
    def scroll_list_to(self, selector, sticky_selector=None):
        self.js(
            """([selector, stickySelector]) => {
              const list = document.querySelector('.list-scroll');
              const el = document.querySelector(selector);
              if (!list || !el) return;
              const stickyEl = stickySelector ? document.querySelector(stickySelector) : null;
              const sticky = stickyEl ? stickyEl.getBoundingClientRect().height : 0;
              list.scrollTop += el.getBoundingClientRect().top - list.getBoundingClientRect().top - sticky;
            }""",
            [selector, sticky_selector],
        )

    # Zeile in der Liste zeigen (block: 'start' | 'center' | 'end')
    def scroll_row(self, id_, block="center"):
        self.page.locator(f'[id="row-{id_}"]').evaluate("(el, block) => el.scrollIntoView({ block })", block)
        self.wait(100)

    def settle(self):
        self.js("document.fonts.ready")
        # Textcursor und Hover-Zustände vermeiden
        self.page.mouse.move(0, 0)
        self.js("document.activeElement?.blur()")
        self.wait(300)


@contextmanager
def open_app(env, data, *, viewport, scale, settings=None, with_catalog=True, reduced_motion=None):
    """Frischer Kontext; mit Katalog: Testdaten schreiben und neu laden. Liefert eine Page."""
    options = {
        "viewport": viewport,
        "device_scale_factor": scale,
        "locale": "de-DE",
        "timezone_id": "Europe/Berlin",
        "color_scheme": "light",
        "contrast": "no-preference",
    }
    if reduced_motion:
        options["reduced_motion"] = reduced_motion
    context = env.browser.new_context(**options)
    try:
        page = context.new_page()
        page.on("pageerror", lambda err: print(f"  [Seitenfehler] {err}"))
        page.goto(env.base_url, wait_until="networkidle")
        if with_catalog:
            page.evaluate(
                _WRITE_DB,
                {
                    "records": data["records"],
                    "lists": data["lists"],
                    "entries": data["entries"],
                    "settings": {**data["settings"], **(settings or {})},
                },
            )
            page.reload(wait_until="networkidle")
        yield Page(page)
    finally:
        context.close()


# ---------- Handbuch ----------

VIEW_W = 1440
VIEW_H = 900


@contextmanager
def handbuch(env, *, with_catalog=True, height=VIEW_H):
    with open_app(env, env.data["handbuch"], viewport={"width": VIEW_W, "height": VIEW_H}, scale=2, with_catalog=with_catalog) as s:
        if with_catalog:
            s.wait_for(
                "document.querySelector('.topbar') && document.querySelector('.detail-pane') && document.getElementById('app')._vnode?.component"
            )
            s.wait(600)
        else:
            s.wait_for('document.querySelector(".welcome")')
            s.wait(400)
        if height != VIEW_H:
            s.set_viewport(VIEW_W, height)
        yield s


# Detailbereich von oben bis zu einer Unterkante (höchstens bis zum Fensterrand bzw. max_height)
def _detail(s, bottom, max_height=math.inf):
    pane = s.rect(".detail-pane")
    if not (bottom and bottom > pane["y"]):
        raise RuntimeError("Unterkante des Ausschnitts nicht gefunden")
    return s.shot({"x": pane["x"], "y": pane["y"], "width": pane["width"], "height": min(bottom - pane["y"], pane["height"], max_height)})


# Ausgangszustand vieler Listen-Szenen: Baum zugeklappt, DEV.4.3 und DEV.3.4 aufgeklappt, DEV.3.4 gewählt
def _dev_rows(s):
    s.act("vm.collapseAll()")
    s.wait(200)
    s.show_control("DEV.4.3")
    s.show_control("DEV.3.4")


def startseite(env):
    with handbuch(env, with_catalog=False) as s:
        return s.shot()


def kataloge_laden(env):
    with handbuch(env, with_catalog=False) as s:
        s.js("document.querySelector('.welcome-cta')?.click()")
        s.wait_for("document.querySelector('dialog[aria-labelledby=\"load-title\"][open]')")
        s.wait(300)
        r = s.rect('dialog[aria-labelledby="load-title"]')
        return s.shot({"x": r["x"] - 10, "y": r["y"] - 10, "width": r["width"] + 20, "height": r["height"] + 20})


def kopfzeile(env):
    with handbuch(env) as s:
        return s.shot(s.rect(".topbar"))


def oberflaeche(env):
    with handbuch(env) as s:
        s.show_control("DEV.3.4")
        s.scroll_list_to('.subgroup-head[data-sub-id="DEV.3"]', '.practice-head[data-practice-id="DEV"]')
        s.wait(300)
        return s.shot()


# Unteranforderungen im Baum: GC.9.1 über drei Ebenen, ohne Auswahl
def unteranforderungen(env):
    with handbuch(env) as s:
        s.act("vm.collapseAll()")
        s.wait(200)
        s.act("vm.selectControl(vm.activeCatalog.controlMap.get('GC.9.1.1.1'))")
        s.wait(300)
        s.act("vm.showCatalogOverview()")
        s.wait(300)
        s.scroll_list_to('.subgroup-head[data-sub-id="GC.9"]', '.practice-head[data-practice-id="GC"]')
        s.wait(300)
        pane = s.rect(".list-pane")
        bottom = s.bottom_of("document.querySelector('.ctrl-row[data-ctrl-id=\"GC.9.1.1.4\"]')")
        return s.shot({"x": pane["x"], "y": pane["y"], "width": pane["width"], "height": bottom - pane["y"] + 1})


# Reiter Übersicht von SENS.11.3 bis einschließlich der Karte mit den Kenngrößen
def detailansicht(env):
    with handbuch(env, height=1600) as s:
        s.show_control("SENS.11.3")
        return _detail(s, s.bottom_of("document.querySelectorAll('.detail-body > .stack > .card')[1]") + 16)


# Aufgeklappte Begriffe unter dem Anforderungstext (SENS.11.3): nur die Karte mit dem Wortlaut
def detail_klappbereich(env):
    with handbuch(env, height=1600) as s:
        s.show_control("SENS.11.3")
        s.act("vm.statementTermsOpen = true")
        s.wait(300)
        pane = s.rect(".detail-pane")
        card = s.rect(".detail-body > .stack > .card")
        return s.shot({"x": pane["x"], "y": card["y"] - 16, "width": pane["width"], "height": card["height"] + 32})


# Kopfbereich einer Unteranforderung (GC.9.1.1.1): Pfadleiste bis zu den Reitern
def detail_kopf(env):
    with handbuch(env, height=1600) as s:
        s.show_control("GC.9.1.1.1")
        return _detail(s, s.bottom_of("document.querySelector('.detail-head .tabs')") + 1)


def detail_hilfestellung(env):
    with handbuch(env, height=1600) as s:
        s.show_control("DEV.3.4", "guidance")
        return _detail(s, s.bottom_of("document.querySelector('.detail-body > .stack > .card')") + 16, 760)


# Eigene Notiz (DEV.3.4), knapp unter der letzten Textzeile
def detail_notizen(env):
    with handbuch(env, height=1600) as s:
        s.show_control("DEV.3.4", "notes")
        bottom = s.js(
            """() => {
              const range = document.createRange();
              range.selectNodeContents(document.querySelector('.notes-text'));
              return range.getBoundingClientRect().bottom;
            }"""
        )
        return _detail(s, bottom + 20)


# Notiz der nicht aktiven Liste „Entwicklungsteam“ (DEV.4.3, nur lesbar)
def detail_notizen_andere(env):
    with handbuch(env, height=1600) as s:
        s.show_control("DEV.4.3", "notes")
        s.act("vm.notesViewListId = 'list-team'")
        s.wait_for("document.querySelector('.notes-readonly')")
        # Das hohe, fast leere Notizfeld auf den Text verkleinern, damit der Hinweis direkt darunter steht
        s.js("(() => { const el = document.querySelector('.notes-text'); el.style.minHeight = '0'; el.style.height = 'auto'; })()")
        s.wait(300)
        return _detail(s, s.bottom_of("document.querySelector('.notes-readonly')") + 16)


# Stern in der Titelzeile als kleines quadratisches Bild
def _stern(control_id):
    def scene(env):
        with handbuch(env) as s:
            s.show_control(control_id)
            r = s.rect(".detail-titlebar .star-btn")
            size = max(r["width"], r["height"]) + 8
            return s.shot(
                {"x": r["x"] + r["width"] / 2 - size / 2, "y": r["y"] + r["height"] / 2 - size / 2, "width": size, "height": size}
            )

    return scene


# Sieben Zeilen von DEV.3.3 bis DEV.4.4 mit Stern und Notiz der aktiven und einer anderen Liste
def listen_markierungen(env):
    with handbuch(env) as s:
        _dev_rows(s)
        s.scroll_list_to('.ctrl-row[data-ctrl-id="DEV.3.3"]', '.practice-head[data-practice-id="DEV"]')
        s.wait(300)
        lst = s.rect(".list-scroll")
        top = s.js("document.querySelector('.ctrl-row[data-ctrl-id=\"DEV.3.3\"]').getBoundingClientRect().top")
        bottom = s.bottom_of("document.querySelector('.ctrl-row[data-ctrl-id=\"DEV.4.4\"]')")
        return s.shot({"x": lst["x"], "y": top, "width": lst["width"], "height": bottom - top})


# Listen in der Filterleiste mit geöffnetem Menü
def listen(env):
    with handbuch(env) as s:
        _dev_rows(s)
        s.js("document.querySelector('.list-row .list-menu-btn')?.click()")
        s.wait(300)
        bounds = s.js(
            """() => {
              const rail = document.querySelector('.rail');
              const listSec = rail?.querySelector('.rail-section');
              const listMenu = document.querySelector('.list-menu');
              if (!rail || !listSec) return null;
              const railR = rail.getBoundingClientRect();
              const secR = listSec.getBoundingClientRect();
              const menuR = listMenu?.getBoundingClientRect();
              const bottom = Math.max(secR.bottom, menuR ? menuR.bottom + 3 : 0);
              return { x: railR.x, y: railR.y, width: railR.width, height: Math.ceil(bottom - railR.y) };
            }"""
        )
        return s.shot(bounds)


def _filter_rows(s, include, exclude):
    s.js(
        """([include, exclude]) => {
          const row = (text) => [...document.querySelectorAll('.rail-row')].find((el) => el.textContent.includes(text));
          row(include)?.querySelector('.rail-row-main')?.click();
          row(exclude)?.querySelector('.rail-btn.btn-cross')?.click();
        }""",
        [include, exclude],
    )
    s.wait_for("document.querySelectorAll('.tag-chip').length >= 2")


# Filter und flache Trefferliste: NUR MUSS, NICHT Aufwand Stufe 5
def filter(env):  # noqa: A001
    with handbuch(env) as s:
        _dev_rows(s)
        _filter_rows(s, "MUSS", "Stufe 5")
        s.js("document.querySelector('.list-scroll').scrollTop = 0")
        s.wait(400)
        pane = s.rect(".list-pane")
        return s.shot({"x": pane["x"], "y": pane["y"], "width": pane["width"], "height": min(pane["height"], 520)})


# Filterleiste bis einschließlich „Modalverben“: NUR MUSS, NICHT Erhöhte Sicherheitsstufe
def filterleiste(env):
    with handbuch(env) as s:
        _dev_rows(s)
        _filter_rows(s, "MUSS", "Erhöhte Sicherheitsstufe")
        s.wait(400)
        rail = s.rect(".rail")
        bottom = s.bottom_of(
            "[...document.querySelectorAll('.rail-section')].find((s) => s.querySelector('.rail-heading-title')?.textContent.trim() === 'Modalverben')"
        )
        return s.shot({"x": rail["x"], "y": rail["y"], "width": rail["width"], "height": bottom - rail["y"] + 4})


# Treffer in Liste übernehmen: Thema DEV.3 als flache Liste, Menü am Stern geöffnet
def treffer_in_liste(env):
    with handbuch(env) as s:
        _dev_rows(s)
        s.act("vm.filters.subgroupFilter = 'DEV.3'; vm.listViewMode = 'flat'")
        s.wait_for("document.querySelectorAll('.tag-chip').length >= 1")
        s.js("document.querySelector('.list-scroll').scrollTop = 0")
        s.js("document.querySelector('.hits-list-anchor .list-menu-btn')?.click()")
        s.wait_for("document.querySelector('.hits-menu')")
        s.wait(300)
        pane = s.rect(".list-pane")
        bottom = s.js(
            """Math.max(
              document.querySelector('.hits-menu').getBoundingClientRect().bottom,
              [...document.querySelectorAll('.list-scroll .ctrl-row')].pop()?.getBoundingClientRect().bottom || 0
            )"""
        )
        return s.shot({"x": pane["x"], "y": pane["y"], "width": pane["width"], "height": bottom - pane["y"] + 12})


# Zielobjektkategorien mit übergeordneten Kategorien: Filterbereich, Chip und Treffer
def filter_zielobjekte(env):
    with handbuch(env) as s:
        _dev_rows(s)
        s.act(
            """
          for (const key of Object.keys(vm.railCollapsed)) vm.railCollapsed[key] = key !== 'targetObjects';
          vm.targetObjectInheritance = true;
          vm.toggleTag('targetObject', 'Führungskräfte', 'include', 'Führungskräfte', 'Zielobjektkategorie');
        """
        )
        s.wait_for("document.querySelector('.rail-row.is-implied')")
        s.js("document.querySelector('.list-scroll').scrollTop = 0")
        s.wait(400)
        rail = s.rect(".rail")
        pane = s.rect(".list-pane")
        bottom = s.bottom_of("document.querySelectorAll('.rail-threats-scroll .rail-row')[7]")
        return s.shot(
            {"x": rail["x"], "y": rail["y"], "width": pane["x"] + pane["width"] - rail["x"], "height": bottom - rail["y"] + 8}
        )


def _catalog_dialog(s):
    s.js("document.querySelector('.topbar-actions button.btn-secondary')?.click()")
    s.wait_for("document.querySelector('dialog[aria-labelledby=\"catalog-title\"][open]')")
    s.wait(400)


# Vergleichsversion im Dialog „Kataloge“ wählen und den Dialog schließen
def _comparison_mode(s):
    _catalog_dialog(s)
    s.js(
        """() => {
          const items = [...document.querySelectorAll('.version-item')];
          const testItem = items.find((it) => it.textContent.includes('Vergleichsversion'));
          testItem?.querySelector('.cat-radio.is-comp')?.click();
        }"""
    )
    s.wait(400)
    s.js("document.querySelector('dialog[aria-labelledby=\"catalog-title\"] .icon-btn')?.click()")
    s.wait_for("document.querySelector('.diff-banner')")
    s.wait(500)


def kataloge_versionen(env):
    with handbuch(env) as s:
        # Hintergrund hinter dem Dialog wie im Handbuch: Zustand nach den Filter-Szenen
        _dev_rows(s)
        _filter_rows(s, "MUSS", "Stufe 5")
        s.js("document.querySelector('.list-scroll').scrollTop = 0")
        s.act("vm.resetFilters()")
        s.act("vm.filters.subgroupFilter = 'DEV.3'; vm.listViewMode = 'flat'")
        s.wait_for("document.querySelectorAll('.tag-chip').length >= 1")
        s.js("document.querySelector('.list-scroll').scrollTop = 0")
        s.act("vm.resetFilters(); vm.listViewMode = 'tree'")
        s.act(
            """
          for (const key of Object.keys(vm.railCollapsed)) vm.railCollapsed[key] = key !== 'targetObjects';
          vm.targetObjectInheritance = true;
          vm.toggleTag('targetObject', 'Führungskräfte', 'include', 'Führungskräfte', 'Zielobjektkategorie');
        """
        )
        s.wait_for("document.querySelector('.rail-row.is-implied')")
        s.js("document.querySelector('.list-scroll').scrollTop = 0")
        s.wait(400)
        s.act(
            """
          vm.targetObjectInheritance = false;
          vm.resetFilters();
          Object.assign(vm.railCollapsed, { lists: false, secLevels: false, modalVerbs: false, effort: false, sourceCatalogs: false, diffs: false });
        """
        )
        s.wait(300)
        _catalog_dialog(s)
        r = s.rect('dialog[aria-labelledby="catalog-title"]')
        return s.shot({"x": r["x"] - 10, "y": r["y"] - 10, "width": r["width"] + 20, "height": r["height"] + 20})


# Vergleichsmodus: Kopfzeile mit Hinweisbalken
def vergleich(env):
    with handbuch(env) as s:
        _dev_rows(s)
        _comparison_mode(s)
        banner = s.rect(".diff-banner")
        return s.shot({"x": 0, "y": 0, "width": VIEW_W, "height": math.ceil(banner["y"] + banner["height"])})


# Reiter Änderungen (DEV.4.3): Änderungsübersicht und Wortvergleich des Anforderungstexts
def detail_aenderungen(env):
    with handbuch(env) as s:
        _dev_rows(s)
        _comparison_mode(s)
        s.set_viewport(VIEW_W, 1600)
        s.show_control("DEV.4.3", "diff")
        return _detail(s, s.bottom_of("document.querySelectorAll('.detail-body > .stack > .card')[1]") + 16)


# ---------- Website ----------

# Breite der Detailsicht (%) für die Detail-Ausschnitte, damit alle Reiter nebeneinander passen
DETAIL_PANE_WIDTH = 38

# Sichtbarer Teil des Notizfelds (CSS-Pixel); das Feld selbst ist deutlich höher
NOTE_VISIBLE_HEIGHT = 72

# Alle Bereiche der Filterleiste zugeklappt; Schlüssel wie RAIL_COLLAPSED_DEFAULT der App
# (fehlende ergänzt die App selbst)
RAIL_ALL_COLLAPSED = dict.fromkeys(
    [
        "lists",
        "practices",
        "secLevels",
        "targetObjects",
        "modalVerbs",
        "actionWords",
        "documentation",
        "tags",
        "securityTargets",
        "effort",
        "threats",
        "sourceCatalogs",
        "diffs",
    ],
    True,
)


@contextmanager
def website(env, *, viewport, scale, settings=None, with_catalog=True):
    with open_app(
        env, env.data["website"], viewport=viewport, scale=scale, settings=settings, with_catalog=with_catalog, reduced_motion="reduce"
    ) as s:
        s.page.wait_for_selector(".list-pane" if with_catalog else ".welcome-cta")
        s.settle()
        yield s


def collapse_state(**overrides):
    return {
        "railCollapsed": {},
        "expandedKeys": [],
        "selectedControlId": "",
        "listViewMode": "tree",
        "statementTermsOpen": False,
        **overrides,
    }


# Die Website-Ausschnitte werden ungerundet übergeben; die Bildmaße im Manifest der Website beruhen darauf
def _region(x, y, width, height):
    return {"x": x, "y": y, "width": width, "height": height}


# Gesamtansicht: Filterleiste, Baum mit DEV.3 aufgeklappt, Detail von DEV.3.4
def website_oberflaeche(env):
    settings = {"saved_collapse_state": collapse_state(expandedKeys=["p_DEV", "sub_DEV.3"], selectedControlId="DEV.3.4")}
    with website(env, viewport={"width": 1440, "height": 900}, scale=4 / 3, settings=settings) as s:
        s.page.wait_for_selector('[id="row-DEV.3.4"].selected')
        s.scroll_row("DEV.3.4", "center")
        return s.page.screenshot()


# Filter nach Zielobjektkategorie mit übergeordneten Kategorien, flache Liste
def website_filter_zielobjekte(env):
    settings = {
        "saved_filter_state": {
            "filters": {"searchQuery": "", "subgroupFilter": "", "controlFilter": ""},
            "activeTags": [
                {
                    "key": "targetObject:Führungskräfte",
                    "category": "targetObject",
                    "value": "Führungskräfte",
                    "mode": "include",
                    "label": "Führungskräfte",
                    "categoryLabel": "Zielobjektkategorie",
                }
            ],
            "railOnlyMatching": False,
            "targetObjectInheritance": True,
        },
        "saved_collapse_state": collapse_state(railCollapsed={**RAIL_ALL_COLLAPSED, "targetObjects": False}, listViewMode="flat"),
    }
    with website(env, viewport={"width": 1280, "height": 800}, scale=2, settings=settings) as s:
        rail = s.box("aside.rail")
        pane = s.box(".list-pane")
        return s.page.screenshot(clip=_region(rail["x"], rail["y"], pane["x"] + pane["width"] - rail["x"], 517))


# Reiter „Notizen“ von DEV.3.4
def website_detail_notizen(env):
    settings = {
        "detail_pane_width": DETAIL_PANE_WIDTH,
        "saved_collapse_state": collapse_state(expandedKeys=["p_DEV", "sub_DEV.3"], selectedControlId="DEV.3.4"),
    }
    with website(env, viewport={"width": 1280, "height": 800}, scale=2, settings=settings) as s:
        s.page.click("#tab-notes")
        s.page.wait_for_selector(".notes-panel")
        s.settle()
        detail = s.box("#detail-pane")
        note = s.box(".notes-text")
        return s.page.screenshot(
            clip=_region(detail["x"], detail["y"], detail["width"], note["y"] + NOTE_VISIBLE_HEIGHT - detail["y"])
        )


# Reiter „Änderungen“ von DEV.4.3 im Vergleich mit der Vergleichsversion, bis unter den Textvergleich
def website_detail_aenderungen(env):
    settings = {
        "comparison_catalog_id": COMPARISON_ID,
        "detail_pane_width": DETAIL_PANE_WIDTH,
        "saved_collapse_state": collapse_state(expandedKeys=["p_DEV", "sub_DEV.4"], selectedControlId="DEV.4.3"),
    }
    with website(env, viewport={"width": 1280, "height": 1200}, scale=2, settings=settings) as s:
        s.page.click("#tab-diff")
        s.page.wait_for_selector("#detail-tabpanel .stack > .card")
        s.settle()
        detail = s.box("#detail-pane")
        card = s.box("#detail-tabpanel .stack > .card:nth-of-type(2)")
        return s.page.screenshot(
            clip=_region(detail["x"], detail["y"], detail["width"], card["y"] + card["height"] + 12 - detail["y"])
        )


# Dialog „Katalog laden“ auf der Startseite (ohne gespeicherten Katalog)
def website_kataloge_laden(env):
    with website(env, viewport={"width": 1280, "height": 800}, scale=2, with_catalog=False) as s:
        s.page.click(".welcome-cta")
        s.page.wait_for_selector("dialog.modal[open]")
        s.settle()
        dlg = s.box("dialog.modal[open]")
        pad = 8
        return s.page.screenshot(clip=_region(dlg["x"] - pad, dlg["y"] - pad, dlg["width"] + 2 * pad, dlg["height"] + 2 * pad))


SCENES = {
    # Handbuch
    "startseite": startseite,
    "kataloge-laden": kataloge_laden,
    "kopfzeile": kopfzeile,
    "oberflaeche": oberflaeche,
    "unteranforderungen": unteranforderungen,
    "detailansicht": detailansicht,
    "detail-klappbereich": detail_klappbereich,
    "detail-kopf": detail_kopf,
    "detail-hilfestellung": detail_hilfestellung,
    "detail-notizen": detail_notizen,
    "detail-notizen-andere": detail_notizen_andere,
    "stern-aktiv": _stern("DEV.3.4"),
    "stern-andere": _stern("DEV.4.3"),
    "stern-keine": _stern("DEV.3.1"),
    "listen-markierungen": listen_markierungen,
    "listen": listen,
    "filter": filter,
    "filterleiste": filterleiste,
    "treffer-in-liste": treffer_in_liste,
    "filter-zielobjekte": filter_zielobjekte,
    "kataloge-versionen": kataloge_versionen,
    "vergleich": vergleich,
    "detail-aenderungen": detail_aenderungen,
    # Website
    "website-oberflaeche": website_oberflaeche,
    "website-filter-zielobjekte": website_filter_zielobjekte,
    "website-detail-notizen": website_detail_notizen,
    "website-detail-aenderungen": website_detail_aenderungen,
    "website-kataloge-laden": website_kataloge_laden,
}
