"""Execute code cells with the project interpreter and save honest captured output."""

import contextlib, io, json, os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
for path in sorted((ROOT / "notebooks").glob("*.ipynb")):
    nb = json.loads(path.read_text())
    scope = {}
    n = 0
    for cell in nb["cells"]:
        if cell["cell_type"] != "code":
            continue
        n += 1
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            exec(compile("".join(cell["source"]), str(path), "exec"), scope)
        cell["execution_count"] = n
        cell["outputs"] = (
            [
                {
                    "output_type": "stream",
                    "name": "stdout",
                    "text": out.getvalue().splitlines(keepends=True),
                }
            ]
            if out.getvalue()
            else []
        )
    path.write_text(json.dumps(nb, indent=2))
    print("Executed:", path.name)
