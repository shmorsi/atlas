import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
const python =
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python";
const port = Number(process.env.ATLAS_PORT || 8000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error("ATLAS_PORT must be an integer from 1024 to 65535.");
  process.exit(1);
}
if (!existsSync(python)) {
  console.error("Run npm run setup first.");
  process.exit(1);
}
const probe = createServer();
await new Promise((resolve, reject) => {
  probe.once("error", reject);
  probe.listen(port, "127.0.0.1", () => probe.close(resolve));
}).catch(() => {
  console.error(
    `Port ${port} is occupied. Stop the existing app or set ATLAS_PORT to another port.`,
  );
  process.exit(1);
});
const validation = spawnSync(python, ["scripts/check_release.py"], {
  stdio: "inherit",
});
if (validation.status !== 0) process.exit(validation.status || 1);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const build = spawnSync(npm, ["run", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (build.status !== 0) process.exit(build.status || 1);
console.log(
  `Starting local release at http://127.0.0.1:${port} (offline / CPU).`,
);
const child = spawn(
  python,
  [
    "-m",
    "uvicorn",
    "atlas.api:app",
    "--app-dir",
    "backend",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    stdio: "inherit",
    detached: process.platform !== "win32",
    env: { ...process.env, OMP_NUM_THREADS: "1", MKL_NUM_THREADS: "1" },
  },
);
child.once("error", (e) => {
  console.error(e.message);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 0 : 1);
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
