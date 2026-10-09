import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
const python =
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python";
if (!existsSync(python)) {
  console.error("Run npm run setup first.");
  process.exit(1);
}
const children = [
  spawn(
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
      "8000",
    ],
    { stdio: "inherit" },
  ),
  spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  }),
];
function stop() {
  for (const c of children) c.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
children.forEach((c) =>
  c.on("exit", (code) => {
    stop();
    process.exitCode = code ?? 0;
  }),
);
