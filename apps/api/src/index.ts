import { serve } from "@hono/node-server";
import { createApp, readAuthAppBearerToken } from "./app";
import { HttpFaceAuthClient } from "./clients/face-auth-client";
import { readAttendancePolicy } from "./config/attendance-policy";
import { loadLocalEnvFile } from "./config/load-local-env";
import { createSqliteDatabase } from "./db/client";
import { DrizzleAdminRepository } from "./repositories/drizzle-admin-repository";
import { DrizzleAttendanceEventRepository } from "./repositories/drizzle-attendance-event-repository";
import { DrizzleAttendanceHistoryRepository } from "./repositories/drizzle-attendance-history-repository";
import { DrizzleAuthRepository } from "./repositories/drizzle-auth-repository";

loadLocalEnvFile();

const port = Number(process.env.API_PORT ?? 3000);
const databasePath = process.env.DATABASE_PATH ?? "./data/smart-gate.sqlite3";
const authToken = readAuthAppBearerToken();
// 起動時に一度だけ検証し、後続の出席判定機能へ同じ設定値を渡す。
readAttendancePolicy();
const db = createSqliteDatabase(databasePath);
const secureCookie = process.env.SESSION_COOKIE_SECURE === "true";
const faceAuthAppUrl = process.env.FACE_AUTH_APP_URL;
const faceAuthAppBearerToken = process.env.FACE_AUTH_APP_BEARER_TOKEN;

if (!faceAuthAppUrl || !faceAuthAppBearerToken) {
  throw new Error(
    "FACE_AUTH_APP_URL and FACE_AUTH_APP_BEARER_TOKEN are required",
  );
}

if (!secureCookie) {
  console.warn("SESSION_COOKIE_SECURE is disabled");
}

const app = createApp({
  authToken,
  attendanceEventRepository: new DrizzleAttendanceEventRepository(db),
  attendanceEventLogger: (entry) => {
    console.log(JSON.stringify(entry));
  },
  authRepository: new DrizzleAuthRepository(db),
  adminRepository: new DrizzleAdminRepository(db),
  attendanceHistoryRepository: new DrizzleAttendanceHistoryRepository(db),
  secureCookie,
  faceAuthClient: new HttpFaceAuthClient(
    faceAuthAppUrl,
    faceAuthAppBearerToken,
  ),
});

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`API server listening on http://localhost:${info.port}`);
  },
);
