import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
for (const test of ["core.mjs", "ui.mjs"]) {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL(test, import.meta.url))],
    { stdio: "inherit", timeout: 60000 },
  );
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
