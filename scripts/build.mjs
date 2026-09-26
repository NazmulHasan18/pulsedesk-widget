import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function loadDotEnv() {
  if (!existsSync(".env")) return {};
  return Object.fromEntries(
    readFileSync(".env", "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^(["'])(.*)\1$/, "$2")]),
  );
}

const fileEnv = loadDotEnv();
const apiBase = process.env.PULSEDESK_API_BASE ?? fileEnv.PULSEDESK_API_BASE ?? "http://localhost:5000/api/v1";
const socketBase = process.env.PULSEDESK_SOCKET_BASE ?? fileEnv.PULSEDESK_SOCKET_BASE ?? "http://localhost:5000";
const define = [
  `--define:__PULSEDESK_API_BASE__=${JSON.stringify(apiBase)}`,
  `--define:__PULSEDESK_SOCKET_BASE__=${JSON.stringify(socketBase)}`,
];
const watch = process.argv.includes("--watch");
const common = ["src/widget.ts", "--bundle", "--target=es2018", ...define];

const builds = watch
  ? [[...common, "--outfile=dist/widget.debug.js", "--watch"]]
  : [
      [...common, "--minify", "--outfile=dist/widget.js"],
      [...common, "--outfile=dist/widget.debug.js"],
    ];

for (const args of builds) {
  const result = spawnSync("node_modules/.bin/esbuild", args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
