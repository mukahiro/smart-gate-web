import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createSqliteDatabase } from "./db/client";
import { createDrizzleAttendanceEventRepository } from "./repositories/drizzle-attendance-event-repository";

const port = Number(process.env.API_PORT ?? 3000);
const databasePath = process.env.DATABASE_PATH ?? "./data/smart-gate.sqlite3";
const db = createSqliteDatabase(databasePath);

const app = createApp({
  attendanceEventRepository: createDrizzleAttendanceEventRepository(db),
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
