import { serve } from "@hono/node-server";
import { createApp, readAuthAppBearerToken } from "./app";
import { createSqliteDatabase } from "./db/client";
import { DrizzleAttendanceEventRepository } from "./repositories/drizzle-attendance-event-repository";
import { DrizzleAttendanceHistoryRepository } from "./repositories/drizzle-attendance-history-repository";
import { DrizzleAuthRepository } from "./repositories/drizzle-auth-repository";

const port = Number(process.env.API_PORT ?? 3000);
const databasePath = process.env.DATABASE_PATH ?? "./data/smart-gate.sqlite3";
const authToken = readAuthAppBearerToken();
const db = createSqliteDatabase(databasePath);
const secureCookie = process.env.SESSION_COOKIE_SECURE === "true";

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
  attendanceHistoryRepository: new DrizzleAttendanceHistoryRepository(db),
  secureCookie,
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
