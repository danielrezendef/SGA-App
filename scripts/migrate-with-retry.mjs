import { spawn } from "node:child_process";

const DEFAULT_MAX_ATTEMPTS = 12;
const DEFAULT_RETRY_DELAY_MS = 5_000;
const MAX_CAPTURED_OUTPUT = 40_000;

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const maxAttempts = readPositiveInteger(
  process.env.MIGRATION_MAX_ATTEMPTS,
  DEFAULT_MAX_ATTEMPTS
);
const retryDelayMs = readPositiveInteger(
  process.env.MIGRATION_RETRY_DELAY_MS,
  DEFAULT_RETRY_DELAY_MS
);

const transientConnectionError =
  /ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|PROTOCOL_CONNECTION_LOST|ER_CON_COUNT_ERROR|connect timeout|connection lost|can't connect to mysql server/i;

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function runMigrationOnce() {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

  return new Promise(resolve => {
    let output = "";
    const migration = spawn(command, ["exec", "drizzle-kit", "migrate"], {
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });

    const capture = chunk => {
      const text = chunk.toString();
      output = `${output}${text}`.slice(-MAX_CAPTURED_OUTPUT);
      return text;
    };

    migration.stdout.on("data", chunk => {
      process.stdout.write(capture(chunk));
    });
    migration.stderr.on("data", chunk => {
      process.stderr.write(capture(chunk));
    });
    migration.on("error", error => {
      output = `${output}\n${error.message}`.slice(-MAX_CAPTURED_OUTPUT);
      resolve({ code: 1, output });
    });
    migration.on("close", code => {
      resolve({ code: code ?? 1, output });
    });
  });
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`[migration] Tentativa ${attempt} de ${maxAttempts}.`);
  const result = await runMigrationOnce();

  if (result.code === 0) {
    console.log("[migration] Migração concluída com sucesso.");
    process.exit(0);
  }

  const canRetry =
    attempt < maxAttempts && transientConnectionError.test(result.output);

  if (!canRetry) {
    if (!transientConnectionError.test(result.output)) {
      console.error(
        "[migration] Falha não transitória detectada; a migração não será repetida."
      );
    } else {
      console.error("[migration] O banco permaneceu indisponível após todas as tentativas.");
    }
    process.exit(result.code);
  }

  console.warn(
    `[migration] Banco temporariamente indisponível. Nova tentativa em ${Math.round(
      retryDelayMs / 1000
    )} segundos.`
  );
  await wait(retryDelayMs);
}
