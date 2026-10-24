"""Relative documentation links have to resolve inside the repository."""

import re

from atlas.data import ROOT

LINK = re.compile(r"\[[^\]]+\]\(([^)\s]+)\)")


def test_relative_markdown_links_resolve():
    missing: list[str] = []
    for path in ROOT.rglob("*.md"):
        if any(part in {".git", "node_modules", ".venv"} for part in path.parts):
            continue
        for match in LINK.finditer(path.read_text(encoding="utf-8")):
            target = match.group(1).split("#", 1)[0]
            if not target or target.startswith(("http://", "https://", "mailto:")):
                continue
            if not re.fullmatch(r"[A-Za-z0-9_./-]+", target):
                continue
            if not (path.parent / target).resolve().exists():
                missing.append(f"{path.relative_to(ROOT)} -> {match.group(1)}")
    assert not missing
