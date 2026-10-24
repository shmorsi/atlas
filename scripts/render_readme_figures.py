"""Draw the README figures from committed JSON. Does not train or round.

Bar lengths use the parsed values. Every printed number is the original token.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIGURES = ROOT / "docs" / "figures"
HELD_OUT = FIGURES / "held-out-rmse.svg"
ARCHITECTURE = FIGURES / "architecture.svg"

INK = "#f5f5f7"
MUTED = "#a8a8ad"
DIM = "#8e8e93"
ACCENT = "#8ec5ff"
BAR = "#3a3f45"
SANS = "Inter Tight, Helvetica Neue, Arial, sans-serif"


def _head(path: Path) -> str:
    return path.read_text(encoding="utf-8").split('"predictions"', 1)[0]


def _num(block: str, key: str) -> str | None:
    match = re.search(rf'"{key}": ([0-9.]+)', block)
    return match.group(1) if match else None


def _rows(path: Path, rmse_key: str) -> list[tuple[str, str, float]]:
    rows: list[tuple[str, str, float]] = []
    for block in re.findall(r"\{[^{}]*\}", _head(path)):
        model = re.search(r'"model": "([^"]+)"', block)
        token = _num(block, rmse_key)
        if model is None or token is None:
            continue
        seed = _num(block, "seed")
        name = model.group(1)
        label = f"{name} · {seed}" if seed and seed not in name else name
        rows.append((label, token, float(token)))
    if not rows:
        raise ValueError(f"No RMSE rows in {path}")
    rows.sort(key=lambda row: row[2])
    return rows


def _esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _text(
    x: float,
    y: float,
    text: str,
    size: int,
    fill: str,
    weight: int = 400,
    anchor: str = "start",
    spacing: str = "0",
) -> str:
    return (
        f'<text x="{x}" y="{y}" fill="{fill}" font-family="{SANS}" '
        f'font-size="{size}" font-weight="{weight}" letter-spacing="{spacing}" '
        f'text-anchor="{anchor}">{_esc(text)}</text>'
    )


def _panel(
    rows: list[tuple[str, str, float]],
    x: float,
    title: str,
    unit: str,
) -> list[str]:
    parts = [
        _text(x, 132, title, 12, DIM, 600, spacing="1.6"),
        _text(x, 154, unit, 13, MUTED),
    ]
    widest = max(row[2] for row in rows)
    top = 182
    for index, (label, token, value) in enumerate(rows):
        y = top + index * 28
        lowest = index == 0
        ink = ACCENT if lowest else INK
        num = ACCENT if lowest else MUTED
        bar = ACCENT if lowest else BAR
        parts.append(_text(x, y, label, 13, ink, 500 if lowest else 400))
        parts.append(
            f'<rect x="{x + 210}" y="{y - 11}" width="180" height="8" '
            f'fill="none" stroke="#ffffff" stroke-opacity="0.14"/>'
        )
        width = 180 * value / widest
        parts.append(
            f'<rect x="{x + 210}" y="{y - 11}" width="{width:.4f}" height="8" '
            f'fill="{bar}"/>'
        )
        parts.append(_text(x + 596, y, token, 12, num, 500 if lowest else 400, "end"))
    return parts


def held_out_svg() -> str:
    graph = _rows(
        ROOT / "data/models/gnn/evaluation.json",
        "rmse_log_percentage_points",
    )
    forecast = _rows(ROOT / "data/models/evaluation.json", "rmse")
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 470" '
            'role="img" width="1280" height="470">'
        ),
        "<title>Held-out test RMSE</title>",
        (
            "<desc>Bar lengths use the committed evaluation values. "
            "Printed numbers are the original JSON tokens. "
            "The accent marks the lowest test RMSE in each panel.</desc>"
        ),
        '<rect width="1280" height="470" fill="#000000"/>',
        (
            '<rect x="0.5" y="0.5" width="1279" height="469" fill="none" '
            'stroke="#ffffff" stroke-opacity="0.14"/>'
        ),
        '<rect x="36" y="36" width="48" height="3" fill="#8ec5ff"/>',
        _text(36, 64, "HELD-OUT TEST RMSE", 12, DIM, 600, spacing="2.4"),
        _text(36, 100, "Reported as measured", 36, INK, 600, spacing="-0.8"),
        *_panel(
            graph,
            36,
            "GRAPH EXPERIMENT  ·  TEST 2022",
            "RMSE, log percentage points",
        ),
        *_panel(
            forecast,
            668,
            "US REAL GDP GROWTH  ·  TEST 2015–2024",
            "RMSE, percentage points",
        ),
        (
            '<line x1="36" y1="432" x2="1244" y2="432" stroke="#ffffff" '
            'stroke-opacity="0.14"/>'
        ),
        _text(
            36,
            454,
            "Axis starts at zero. Accent marks the lowest test RMSE in that panel.",
            12,
            DIM,
        ),
        "</svg>",
        "",
    ]
    return "\n".join(parts)


def _box(x: float, title: str, lines: list[str], accent: bool = False) -> list[str]:
    stroke = ACCENT if accent else "#ffffff"
    opacity = "1" if accent else "0.34"
    parts = [
        (
            f'<rect x="{x}" y="132" width="176" height="150" fill="#000000" '
            f'stroke="{stroke}" stroke-opacity="{opacity}"/>'
        ),
        _text(x + 14, 160, title, 12, ACCENT if accent else DIM, 600, spacing="1.4"),
    ]
    for index, line in enumerate(lines):
        parts.append(_text(x + 14, 186 + index * 20, line, 13, INK))
    return parts


def architecture_svg() -> str:
    boxes = [
        (
            36,
            "SOURCES",
            ["World Bank", "Natural Earth", "OECD ICIO", "Treasury · Fed/ECB"],
            False,
        ),
        (232, "CACHE", ["Raw files", "Content hashes", "No startup download"], False),
        (428, "CHECKS", ["Finite values", "Reconciliation", "Spectral radius"], False),
        (624, "COMPUTE", ["DuckDB, NumPy", "SciPy, CVXPY", "Saved PyTorch"], False),
        (820, "API", ["FastAPI", "127.0.0.1 only", "Typed requests"], True),
        (1016, "UI", ["React workspaces", "Offline map", "Labeled results"], False),
    ]
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1228 348" '
            'role="img" width="1228" height="348">'
        ),
        "<title>ATLAS local pipeline</title>",
        (
            "<desc>Sources, cache, checks, compute, a loopback API, and the UI. "
            "No evaluation numbers are drawn here.</desc>"
        ),
        '<rect width="1228" height="348" fill="#000000"/>',
        (
            '<rect x="0.5" y="0.5" width="1227" height="347" fill="none" '
            'stroke="#ffffff" stroke-opacity="0.14"/>'
        ),
        '<rect x="36" y="32" width="48" height="3" fill="#8ec5ff"/>',
        _text(36, 60, "LOCAL PIPELINE", 12, DIM, 600, spacing="2.4"),
        _text(36, 96, "One process. Loopback only.", 32, INK, 600, spacing="-0.6"),
    ]
    for index, (x, title, lines, accent) in enumerate(boxes):
        parts.extend(_box(x, title, lines, accent))
        if index < len(boxes) - 1:
            x1 = x + 176
            x2 = boxes[index + 1][0]
            parts.append(
                f'<line x1="{x1}" y1="207" x2="{x2}" y2="207" '
                'stroke="#ffffff" stroke-opacity="0.34"/>'
            )
    parts.extend(
        [
            _text(
                36,
                324,
                "Observed history, hypothetical scenarios, and learned "
                "predictions stay apart.",
                13,
                MUTED,
            ),
            "</svg>",
            "",
        ]
    )
    return "\n".join(parts)


def render() -> tuple[str, str]:
    """Return the held-out RMSE figure and the pipeline figure."""
    return held_out_svg(), architecture_svg()


def main() -> None:
    """Write both figures under docs/figures."""
    FIGURES.mkdir(parents=True, exist_ok=True)
    held, architecture = render()
    HELD_OUT.write_text(held, encoding="utf-8", newline="\n")
    ARCHITECTURE.write_text(architecture, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
