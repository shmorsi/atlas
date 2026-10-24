"""Documented Python support has to be what CI installs."""

from atlas.data import ROOT


def test_validate_matrix_matches_documented_python():
    workflow = (ROOT / ".github/workflows/validate.yml").read_text()
    assert "python-version: ['3.12', '3.13']" in workflow
    assert "python-version: ${{ matrix.python-version }}" in workflow
    setup = (ROOT / "scripts/setup.mjs").read_text()
    assert setup.index('"python3"') < setup.index('"python3.12"')
    for path in (ROOT / "docs/DEVELOPMENT.md", ROOT / "README.md"):
        assert "3.12 only" not in path.read_text()
