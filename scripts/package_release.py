"""Package tracked source + production assets; exclude local environments and uploads."""

import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from check_release import check

if __name__ == "__main__":
    result = check()
    if not (ROOT / "dist/index.html").exists():
        raise SystemExit("Run npm run build first")
    files = {
        ROOT / p
        for p in subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
        .decode()
        .split("\0")
        if p
    }
    files.update(p for p in (ROOT / "dist").rglob("*") if p.is_file())
    files.update(
        p for p in (ROOT / "frontend/public/maplibre").rglob("*") if p.is_file()
    )
    destination = ROOT.parent / "ATLAS-release.zip"
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as z:
        for path in sorted(files):
            if path.is_file():
                z.write(path, "atlas/" + str(path.relative_to(ROOT)))
        z.writestr("atlas/RELEASE_VERIFICATION.json", json.dumps(result, indent=2))
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    destination.with_suffix(".zip.sha256").write_text(f"{digest}  {destination.name}\n")
    print(f"Packaged {len(files)} files: {destination.name}; SHA-256 {digest}")
