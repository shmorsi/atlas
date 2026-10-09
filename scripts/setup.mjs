import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
const win = process.platform === "win32";
function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: win });
  if (r.status !== 0) process.exit(r.status || 1);
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
if (!existsSync(".venv")) run(python, ["-m", "venv", ".venv"]);
run(venv, ["-m", "pip", "install", "-r", "requirements-lock.txt"]);
run(venv, ["scripts/prepare_data.py"]);
console.log("Ready. Run npm run atlas. No data download is needed.");
