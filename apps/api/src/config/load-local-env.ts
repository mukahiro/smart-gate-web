import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const rootEnvUrl = new URL("../../../../.env", import.meta.url);

export const loadLocalEnvFile = (envUrl: URL = rootEnvUrl): boolean => {
  try {
    // systemd等で設定済みの環境変数はloadEnvFileによって上書きされない。
    loadEnvFile(fileURLToPath(envUrl));
    return true;
  } catch (cause) {
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "ENOENT"
    ) {
      return false;
    }
    throw cause;
  }
};
