import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
const win = process.platform === "win32";
function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.error) console.error(r.error.message);
  if (r.status !== 0) process.exit(r.status || 1);
}
function torchPin() {
  const match = readFileSync("requirements-lock.txt", "utf8").match(
    /^torch==(\S+)\s*$/m,
  );
  if (!match) {
    console.error("requirements-lock.txt is missing a torch pin.");
    process.exit(1);
  }
  return match[1];
}
const venv = win ? ".venv/Scripts/python.exe" : ".venv/bin/python";
const candidates = [
  ...(existsSync(venv) ? [venv] : []),
  ...(win ? ["python"] : ["python3.12", "python3.13", "python3"]),
];
const python = candidates.find((cmd) => {
  const r = spawnSync(cmd, [
    "-c",
    "import sys;assert (3,12)<=sys.version_info[:2]<=(3,13)",
  ]);
  return r.status === 0;
});
if (!python) {
  console.error("Install Python 3.12–3.13 and put it on PATH.");
  process.exit(1);
}
const pipReady =
  existsSync(venv) &&
  spawnSync(venv, ["-m", "pip", "--version"], { stdio: "ignore" }).status === 0;
if (!pipReady) {
  rmSync(".venv", { recursive: true, force: true });
  run(python, ["-m", "venv", ".venv"]);
}
// Linux PyPI torch is the CUDA build. Inference is CPU-only; use the same
// CPU wheel as the Docker image so a fresh clone does not pull CUDA libraries.
if (process.platform === "linux") {
  run(venv, [
    "-m",
    "pip",
    "install",
    "--no-deps",
    "--index-url",
    "https://download.pytorch.org/whl/cpu",
    `torch==${torchPin()}`,
  ]);
}
run(venv, ["-m", "pip", "install", "-r", "requirements-lock.txt"]);
if (process.platform === "linux") {
  run(venv, [
    "-c",
    "import torch; raise SystemExit(0 if torch.__version__.endswith('+cpu') else 'Linux setup expected the CPU torch wheel, found ' + torch.__version__)",
  ]);
}
if (!existsSync("data/processed/observations.parquet"))
  run(venv, ["scripts/prepare_data.py"]);
if (!existsSync("data/processed/treasury.parquet"))
  run(venv, ["scripts/prepare_treasury.py"]);
run(venv, ["scripts/check_release.py"]);
console.log("Ready. Run npm run atlas. No data download is needed.");
