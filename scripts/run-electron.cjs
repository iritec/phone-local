#!/usr/bin/env node

const { spawn } = require("node:child_process");
const electronBinary = require("electron");

const args = process.argv.slice(2);
const env = { ...process.env };

for (const key of [
  "ELECTRON_RUN_AS_NODE",
  "ELECTRON_EXEC_PATH",
  "ELECTRON_RENDERER_URL",
  "ELECTRON_CLI_ARGS",
]) {
  delete env[key];
}

const child = spawn(electronBinary, args, {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
