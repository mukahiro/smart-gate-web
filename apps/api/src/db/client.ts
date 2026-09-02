import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

export type SqliteDatabase = ReturnType<typeof drizzle>;

type CreateSqliteDatabaseOptions = {
  migrationsFolder?: string;
};

export const createSqliteDatabase = (
  databasePath: string,
  {
    migrationsFolder = process.env.DATABASE_MIGRATIONS_PATH ?? "./drizzle",
  }: CreateSqliteDatabaseOptions = {},
): SqliteDatabase => {
  const resolvedDatabasePath = resolve(databasePath);

  mkdirSync(dirname(resolvedDatabasePath), { recursive: true });

  const sqlite = new Database(resolvedDatabasePath, { timeout: 5000 });
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);

  migrate(db, { migrationsFolder: resolve(migrationsFolder) });

  return db;
};
