import { execFile, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { createClient } from "redis";

const execute = promisify(execFile);
const root = new URL("../", import.meta.url);
const servers = [];
let directory;
let postgresBin;
let postgresStarted = false;

async function binary(name, candidates = []) {
  const found = spawnSync("which", [name], { encoding: "utf8" });
  for (const path of [...candidates, found.status === 0 ? found.stdout.trim() : ""].filter(Boolean)) {
    try {
      await access(path);
      return path;
    } catch {
      /* Try the next installed binary. */
    }
  }
  throw new Error(
    `Missing ${name}. Install PostgreSQL and Redis, set PG_BIN, or provide INTEGRATION_DATABASE_URL and INTEGRATION_REDIS_URL for disposable test services.`
  );
}
async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Could not allocate test port");
  const port = address.port;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return port;
}
async function startServices() {
  const postgres = await binary("postgres", [
    ...(process.env.PG_BIN ? [join(process.env.PG_BIN, "postgres")] : []),
    "/Applications/Postgres.app/Contents/Versions/latest/bin/postgres",
  ]);
  postgresBin = dirname(postgres);
  const redis = await binary("redis-server");
  directory = await mkdtemp(join(tmpdir(), "id-api-integration-"));
  const pgPort = await freePort();
  const redisPort = await freePort();
  await execute(join(postgresBin, "initdb"), [
    "-D",
    join(directory, "pg"),
    "-U",
    "integration",
    "--auth=trust",
    "--no-locale",
    "--encoding=UTF8",
  ]);
  await execute(join(postgresBin, "pg_ctl"), [
    "-D",
    join(directory, "pg"),
    "-l",
    join(directory, "postgres.log"),
    "-o",
    `-h 127.0.0.1 -p ${pgPort} -k ${directory} -F`,
    "-w",
    "start",
  ]);
  postgresStarted = true;
  const child = spawn(
    redis,
    ["--bind", "127.0.0.1", "--port", String(redisPort), "--save", "", "--appendonly", "no", "--dir", directory],
    { stdio: "ignore" }
  );
  servers.push(child);
  const redisUrl = `redis://127.0.0.1:${redisPort}`;
  const client = createClient({ url: redisUrl, socket: { reconnectStrategy: false, connectTimeout: 200 } });
  client.on("error", () => {});
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        await client.connect();
        await client.ping();
        break;
      } catch (error) {
        if (attempt >= 50 || child.exitCode !== null) throw error;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  } finally {
    if (client.isOpen) client.destroy();
  }
  return {
    INTEGRATION_DATABASE_URL: `postgres://integration@127.0.0.1:${pgPort}/postgres`,
    INTEGRATION_REDIS_URL: redisUrl,
  };
}
try {
  const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
  const redisUrl = process.env.INTEGRATION_REDIS_URL;
  if (Boolean(databaseUrl) !== Boolean(redisUrl))
    throw new Error("Provide both integration URLs, or neither to start disposable local services.");
  const settings = databaseUrl && redisUrl ? {} : await startServices();
  const jest = spawn(
    process.execPath,
    [
      "--experimental-vm-modules",
      "node_modules/jest/bin/jest.js",
      "--config",
      "jest.integration.config.ts",
      "--runInBand",
      ...process.argv.slice(2),
    ],
    { cwd: root, env: { ...process.env, ...settings, NODE_ENV: "test" }, stdio: "inherit" }
  );
  const interrupt = () => jest.kill("SIGINT");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  const [code] = await once(jest, "exit");
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  process.exitCode = code ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (directory) {
    try {
      console.error(await readFile(join(directory, "postgres.log"), "utf8"));
    } catch {
      /* Startup may fail before logging. */
    }
  }
  process.exitCode = 1;
} finally {
  for (const child of servers) {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  }
  if (postgresStarted)
    await execute(join(postgresBin, "pg_ctl"), ["-D", join(directory, "pg"), "-m", "immediate", "-w", "stop"]);
  if (directory) await rm(directory, { recursive: true, force: true });
}
