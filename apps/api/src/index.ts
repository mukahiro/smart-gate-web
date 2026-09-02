import { serve } from "@hono/node-server";
import { createApp, readAuthAppBearerToken } from "./app";
import { createSqliteDatabase } from "./db/client";
import { createDrizzleAttendanceEventRepository } from "./repositories/drizzle-attendance-event-repository";
import { createDrizzleAuthRepository } from "./repositories/drizzle-auth-repository";

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
  attendanceEventRepository: createDrizzleAttendanceEventRepository(db),
  attendanceEventLogger: (entry) => {
    console.log(JSON.stringify(entry));
  },
  authRepository: createDrizzleAuthRepository(db),
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
