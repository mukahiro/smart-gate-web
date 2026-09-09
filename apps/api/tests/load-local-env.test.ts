import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadLocalEnvFile } from "../src/config/load-local-env";

const testKey = "SMART_GATE_TEST_ENV_VALUE";

afterEach(() => {
  delete process.env[testKey];
});

describe("loadLocalEnvFile", () => {
  it("loads values from the specified env file", () => {
    const directory = mkdtempSync(join(tmpdir(), "smart-gate-env-test-"));
    const path = join(directory, ".env");
    writeFileSync(path, `${testKey}=loaded\n`);

    expect(loadLocalEnvFile(pathToFileURL(path))).toBe(true);
    expect(process.env[testKey]).toBe("loaded");
  });

  it("keeps an environment value that is already configured", () => {
    const directory = mkdtempSync(join(tmpdir(), "smart-gate-env-test-"));
    const path = join(directory, ".env");
    writeFileSync(path, `${testKey}=from-file\n`);
    process.env[testKey] = "from-process";

    loadLocalEnvFile(pathToFileURL(path));

    expect(process.env[testKey]).toBe("from-process");
  });

  it("allows deployments without a local env file", () => {
    expect(loadLocalEnvFile(pathToFileURL("/missing/smart-gate/.env"))).toBe(
      false,
    );
  });
});
