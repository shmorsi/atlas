# Development

Short guide for running, checking, and changing ATLAS. The scientific results live in the committed evaluation files. This guide does not change them.

## Prerequisites

- Node.js 22 or newer
- Python 3.12 or 3.13. The [validate workflow](../.github/workflows/validate.yml) runs 3.12 only.
- A modern WebGL2 browser
- On Debian and Ubuntu, the venv module is a separate package. If `python3 -m venv` says `ensurepip` is unavailable, install `python3.12-venv` (or `python3.13-venv`) and run setup again.
- On Windows, use Python from python.org and run the commands in PowerShell. Replace `.venv/bin/python` below with `.venv/Scripts/python.exe`.

`.venv` and `node_modules` are local. They are not part of Git.

## Install and run

```sh
npm ci
npm run setup
npm run atlas
```

Open http://127.0.0.1:8000. API docs: http://127.0.0.1:8000/docs. Stop with Ctrl+C.

`npm run setup` creates `.venv`, installs `requirements-lock.txt`, and runs `scripts/check_release.py`. On Linux it first installs the CPU-only PyTorch wheel at the lock pin from `https://download.pytorch.org/whl/cpu`, the same wheel the Docker image uses, then installs the lock and checks that `torch.__version__` ends with `+cpu`. macOS and Windows wheels for that pin are already CPU builds. Setup recreates `.venv` if its `pip` module does not run.

Installation needs a network. A normal start uses bundled data and does not call an external service. `npm run atlas` binds to loopback, checks source and model integrity, builds production assets, and serves the UI and API from one FastAPI process. It does not use Vite for that process. Set `ATLAS_PORT` to choose another port.

Hot reload during development:

```sh
npm run develop
```

The UI is on port 5173 and the API on port 8000.

## Docker

```sh
docker build -t atlas .
docker run --rm -p 127.0.0.1:8000:8000 atlas
```

Publish with the `127.0.0.1:` prefix. The process listens on all interfaces inside the container so Docker can forward the port; the prefix keeps it on this machine. Another host port is `-p 127.0.0.1:8001:8000`. The image health check uses `/api/ready`. The [Docker workflow](../.github/workflows/docker.yml) builds the image and smoke-tests the API and UI on every pull request.

## Checks

```sh
npm run lint:python
npm run test:backend
npm run build
npm run verify:release
npx playwright install chromium
# Production server already running:
ATLAS_TEST_URL=http://127.0.0.1:8000 npm run test:ui
```

`npm run lint:python` runs Ruff 0.16.10, the version pinned in `requirements-lock.txt`, on `backend` and `scripts`. The validate workflow runs the same command on Ubuntu, macOS, and Windows.

Pixel comparisons use the committed macOS Chromium baselines under `tests/`. On other operating systems those comparisons are skipped, and the suite does not rewrite `docs/screenshots/`. Regenerate baselines on macOS only, after an intentional visual change.

`npm run package` builds the frontend, runs the integrity gate, and writes `../ATLAS-release.zip` plus a SHA-256 checksum.

## Data refresh

Refresh is explicit. Startup does not download.

```sh
.venv/bin/python scripts/fetch_data.py
.venv/bin/python scripts/prepare_data.py
npm run refresh:annual
npm run refresh:public
```

`refresh:annual` updates the latest completed annual World Bank cache. It does not alter the frozen GRU training rows. `refresh:public` updates Treasury and official event feeds. The same action is in the Events workspace.

## Models and notebooks

```sh
.venv/bin/python scripts/train.py
.venv/bin/python scripts/check_notebooks.py
```

Training rewrites checkpoints and evaluation files. Do that only when you intend a new experiment, and do not hand-edit hashes, manifests, caches, checkpoints, `evaluation.json`, `docs/LOCAL_LATENCY.json`, or `docs/ICIO_SAMPLE_AUDIT.json`.

## Where code lives

| Path | Role |
|---|---|
| `frontend/src` | React workspaces. Production UI is the Vite build in `dist/`. |
| `backend/atlas` | FastAPI app, data access, economics, finance, network, studio, and forecast replay. |
| `scripts` | Setup, release gate, data import, training, packaging. |
| `data` | Bundled caches, hashes, and saved experiments. Treat result files as locked. |
| `tests` | Playwright specs and macOS screenshot baselines. |
| `learning` | Three notebooks executed by `scripts/check_notebooks.py`. |

Route docstrings are the OpenAPI descriptions at `/docs`. Library functions in `backend/atlas` carry type hints. Adding a return annotation on a route would let FastAPI infer a response model, so routes stay unannotated on purpose.
