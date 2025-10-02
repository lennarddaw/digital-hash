#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
tree_dump.py — Schreibe die Ordner- und Filestruktur als ASCII-Tree in eine TXT.
- Exkludiere Ordner anhand ihrer Namen (egal an welcher Stelle im Baum).
- Optional: max. Tiefe festlegen, Symlinks folgen, versteckte Dateien mit erfassen.
- Fehler (z. B. PermissionError) werden sauber im Tree vermerkt statt das Skript zu beenden.

Beispiele:
  python tree_dump.py . -o tree.txt -x node_modules -x .git -x __pycache__
  python tree_dump.py C:\Projekte\MeinRepo -x "node_modules,dist" --max-depth 4
"""

import argparse
import os
from pathlib import Path
from typing import Iterable, Set, Optional


def _normalize_excludes(raw: Iterable[str]) -> Set[str]:
    """
    Nimmt eine Liste aus -x/--exclude Argumenten (auch komma-getrennt) und
    normalisiert sie auf casefold()-Strings (für case-insensitive Vergleiche).
    """
    names: Set[str] = set()
    for item in raw:
        if not item:
            continue
        for part in str(item).split(","):
            name = part.strip()
            if name:
                names.add(name.casefold())
    return names


def generate_tree(
    root: Path,
    exclude_dir_names: Set[str],
    follow_links: bool = False,
    max_depth: Optional[int] = None,
) -> Iterable[str]:
    """
    Erzeugt zeilenweise den ASCII-Tree ab 'root'.
    - exclude_dir_names: Ordnernamen (case-insensitive), die übersprungen werden sollen.
    - follow_links: True => auch in symbolischen Link-Ordnern weitergehen (mit Loop-Schutz).
    - max_depth: maximale Tiefe (None = unbegrenzt). Tiefe 0 = root, 1 = Kinder, usw.
    """

    visited_dirs = set()  # Loop-Schutz, falls follow_links=True

    def _dir_entries(directory: Path):
        """Liest Einträge sicher, sortiert: erst Ordner, dann Dateien (case-insensitive)."""
        try:
            dirs = []
            files = []
            for entry in directory.iterdir():
                # Ordner filtern
                if entry.is_dir():
                    if entry.name.casefold() in exclude_dir_names:
                        continue
                    dirs.append(entry)
                else:
                    files.append(entry)
            # Sortierung: Ordner alphabetisch, danach Dateien alphabetisch
            dirs.sort(key=lambda p: p.name.casefold())
            files.sort(key=lambda p: p.name.casefold())
            return dirs + files
        except PermissionError as e:
            # Keine Rechte: einen Fehlerknoten ausgeben
            return [f"[PermissionError: {e}]"]
        except FileNotFoundError as e:
            return [f"[FileNotFoundError: {e}]"]
        except OSError as e:
            return [f"[OSError: {e}]"]

    def _should_recurse_into(d: Path) -> bool:
        if not d.is_dir():
            return False
        if d.is_symlink() and not follow_links:
            return False
        if follow_links:
            try:
                key = d.resolve()
            except Exception:
                key = d
            if key in visited_dirs:
                return False
            visited_dirs.add(key)
        return True

    def _walk(directory: Path, prefix: str, depth: int):
        if max_depth is not None and depth > max_depth:
            return

        entries = _dir_entries(directory)
        # Falls _dir_entries einen Fehler-String zurückgab:
        if entries and isinstance(entries[0], str):
            # einzelner Fehlerknoten
            for i, item in enumerate(entries):
                connector = "└── " if i == len(entries) - 1 else "├── "
                yield f"{prefix}{connector}{item}"
            return

        total = len(entries)
        for idx, entry in enumerate(entries):
            is_last = (idx == total - 1)
            connector = "└── " if is_last else "├── "

            if isinstance(entry, Path):
                # Symlink-Anzeige
                if entry.is_symlink():
                    try:
                        target = os.readlink(entry)
                    except OSError:
                        target = "?"
                    display = f"{entry.name} -> {target}"
                else:
                    display = entry.name
                yield f"{prefix}{connector}{display}"

                # Rekursion in Ordner
                if _should_recurse_into(entry):
                    new_prefix = prefix + ("    " if is_last else "│   ")
                    yield from _walk(entry, new_prefix, depth + 1)
            else:
                # Sollte hier nicht vorkommen; Fallback
                yield f"{prefix}{connector}{entry}"

    # Kopfzeile mit Root
    try:
        root_display = root.resolve()
    except Exception:
        root_display = root
    yield f"{root_display}"
    yield from _walk(root, prefix="", depth=1)


def main():
    parser = argparse.ArgumentParser(
        description="Schreibe die Ordner- und Filestruktur als ASCII-Tree in eine TXT-Datei."
    )
    parser.add_argument(
        "root",
        nargs="?",
        default=".",
        help="Startverzeichnis (Standard: aktuelles Verzeichnis).",
    )
    parser.add_argument(
        "-o",
        "--output",
        help="Ausgabedatei (.txt). Standard: tree-<rootname>.txt im aktuellen Verzeichnis.",
    )
    parser.add_argument(
        "-x",
        "--exclude",
        action="append",
        default=[],
        help=(
            "Ordnername zum Ausschließen (nur Name, nicht Pfad). "
            "Kann mehrfach angegeben oder komma-getrennt werden. "
            "Beispiel: -x cache -x .git -x '__pycache__,dist,node_modules'"
        ),
    )
    parser.add_argument(
        "--follow-links",
        action="store_true",
        help="Auch in symbolische Link-Ordner wechseln (mit Loop-Schutz).",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=None,
        help="Maximale Tiefe (0 = nur Root, 1 = Kinder, ...). Standard: unbegrenzt.",
    )

    args = parser.parse_args()

    root_path = Path(args.root).expanduser()
    if not root_path.exists():
        raise SystemExit(f"Pfad existiert nicht: {root_path}")

    exclude_names = _normalize_excludes(args.exclude)

    if args.output:
        out_path = Path(args.output).expanduser()
    else:
        out_path = Path.cwd() / f"tree-{root_path.name}.txt"

    lines = generate_tree(
        root=root_path,
        exclude_dir_names=exclude_names,
        follow_links=args.follow_links,
        max_depth=args.max_depth,
    )

    # Schreiben
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8", newline="\n") as fh:
        for line in lines:
            fh.write(f"{line}\n")

    print(f"✅ Tree gespeichert: {out_path}")


if __name__ == "__main__":
    main()
