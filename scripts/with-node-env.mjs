import { spawn } from "node:child_process";

const [, , nodeEnv, command, ...args] = process.argv;

if (!nodeEnv || !command) {
  console.error("Usage: node scripts/with-node-env.mjs <NODE_ENV> <command> [...args]");
  process.exit(1);
}

function quoteWindowsArg(arg) {
  if (!/[\s"&|<>^]/.test(arg)) {
    return arg;
  }

  return `"${arg.replace(/"/g, '\\"')}"`;
}

const isWindows = process.platform === "win32";
const child = isWindows
  ? spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", [command, ...args].map(quoteWindowsArg).join(" ")], {
      env: {
        ...process.env,
        NODE_ENV: nodeEnv,
      },
      stdio: "inherit",
    })
  : spawn(command, args, {
      env: {
        ...process.env,
        NODE_ENV: nodeEnv,
      },
      stdio: "inherit",
    });

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
