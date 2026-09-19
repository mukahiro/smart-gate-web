import { randomUUID } from "node:crypto";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import argon2 from "argon2";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { attendanceEvents } from "../src/db/attendance-event-schema";
import { sessions, userCredentials } from "../src/db/auth-schema";
import { type SqliteDatabase, createSqliteDatabase } from "../src/db/client";
import { users } from "../src/db/user-schema";

const studentNumberSchema = z
  .string()
  .trim()
  .regex(/^(?:[0-9]{10}|[0-9]{2}-[0-9]{4}-[0-9]{3}-[0-9])$/)
  .transform((value) => value.replaceAll("-", ""));
const emailSchema = z.string().trim().email().max(254);
const passwordSchema = z.string().min(12).max(128);
const nameSchema = z.string().trim().min(1).max(100);
const lcdDisplayNameSchema = z.string().trim().min(1).max(20);

export const normalizeStudentNumber = (value: string) =>
  studentNumberSchema.parse(value);

export const createUser = async (
  db: SqliteDatabase,
  input: {
    studentNumber: string;
    name: string;
    lcdDisplayName: string;
    email: string;
    password: string;
  },
  options: { userId?: string; now?: string; isAdmin?: boolean } = {},
) => {
  const userId = options.userId ?? randomUUID();
  const now = options.now ?? new Date().toISOString();
  const studentNumber = normalizeStudentNumber(input.studentNumber);
  const name = nameSchema.parse(input.name);
  const lcdDisplayName = lcdDisplayNameSchema.parse(input.lcdDisplayName);
  const email = emailSchema.parse(input.email);
  const emailNormalized = email.toLowerCase();
  const password = passwordSchema.parse(input.password);
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  return db.transaction((tx) => {
    tx.insert(users)
      .values({
        id: userId,
        studentNumber,
        name,
        lcdDisplayName,
        email,
        emailNormalized,
        userType: "student",
        isAdmin: options.isAdmin ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    tx.insert(userCredentials)
      .values({
        userId,
        passwordHash,
        passwordChangedAt: now,
        updatedAt: now,
      })
      .run();
    const linkedEvents = tx
      .update(attendanceEvents)
      .set({ userId })
      .where(
        and(
          eq(attendanceEvents.studentNumberSnapshot, studentNumber),
          isNull(attendanceEvents.userId),
        ),
      )
      .run();

    return { userId, linkedEventCount: linkedEvents.changes };
  });
};

export const resetPassword = async (
  db: SqliteDatabase,
  studentNumberInput: string,
  passwordInput: string,
  now = new Date().toISOString(),
) => {
  const studentNumber = normalizeStudentNumber(studentNumberInput);
  const password = passwordSchema.parse(passwordInput);
  const user = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.studentNumber, studentNumber))
    .get();

  if (!user) {
    throw new Error("利用者が見つかりません");
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  db.transaction((tx) => {
    tx.update(userCredentials)
      .set({
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
        passwordChangedAt: now,
        updatedAt: now,
      })
      .where(eq(userCredentials.userId, user.id))
      .run();
    tx.delete(sessions).where(eq(sessions.userId, user.id)).run();
  });
};

export const setUserActive = (
  db: SqliteDatabase,
  studentNumberInput: string,
  isActive: boolean,
  now = new Date().toISOString(),
) => {
  const studentNumber = normalizeStudentNumber(studentNumberInput);

  return db.transaction((tx) => {
    const user = tx
      .select()
      .from(users)
      .where(eq(users.studentNumber, studentNumber))
      .get();
    if (!user) {
      throw new Error("利用者が見つかりません");
    }
    if (!isActive && user.isActive && user.isAdmin) {
      const activeAdmins = tx
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.isAdmin, true), eq(users.isActive, true)))
        .get()?.value;
      if ((activeAdmins ?? 0) <= 1) {
        throw new Error("最後の有効な管理者は無効化できません");
      }
    }
    const updated = tx
      .update(users)
      .set({ isActive, updatedAt: now })
      .where(eq(users.studentNumber, studentNumber))
      .run();

    if (!isActive) {
      tx.delete(sessions).where(eq(sessions.userId, user.id)).run();
    }
  });
};

export const unlockUser = (
  db: SqliteDatabase,
  studentNumberInput: string,
  now = new Date().toISOString(),
) => {
  const studentNumber = normalizeStudentNumber(studentNumberInput);
  const user = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.studentNumber, studentNumber))
    .get();

  if (!user) {
    throw new Error("利用者が見つかりません");
  }

  db.update(userCredentials)
    .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: now })
    .where(eq(userCredentials.userId, user.id))
    .run();
};

export const setUserAdmin = (
  db: SqliteDatabase,
  studentNumberInput: string,
  isAdmin: boolean,
  now = new Date().toISOString(),
) => {
  const studentNumber = normalizeStudentNumber(studentNumberInput);

  db.transaction((tx) => {
    const user = tx
      .select()
      .from(users)
      .where(eq(users.studentNumber, studentNumber))
      .get();
    if (!user) {
      throw new Error("利用者が見つかりません");
    }
    if (user.isAdmin === isAdmin) {
      return;
    }
    if (user.isAdmin && !isAdmin && user.isActive) {
      const activeAdmins = tx
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.isAdmin, true), eq(users.isActive, true)))
        .get()?.value;
      if ((activeAdmins ?? 0) <= 1) {
        throw new Error("最後の有効な管理者は降格できません");
      }
    }
    tx.update(users)
      .set({ isAdmin, updatedAt: now })
      .where(eq(users.id, user.id))
      .run();
  });
};

const ask = async (question: string) => {
  const readline = createInterface({ input: stdin, output: stdout });
  const answer = await readline.question(question);
  readline.close();
  return answer;
};

const askPassword = async () => {
  if (!stdin.isTTY || !stdout.isTTY || !stdin.setRawMode) {
    throw new Error("パスワード入力には対話端末が必要です");
  }

  stdout.write("パスワード: ");
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise<string>((resolve, reject) => {
    let password = "";
    const finish = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const onData = (data: Buffer) => {
      const value = data.toString("utf8");
      if (value === "\u0003") {
        finish();
        reject(new Error("入力を中断しました"));
      } else if (value === "\r" || value === "\n") {
        finish();
        resolve(password);
      } else if (value === "\u007f") {
        password = Array.from(password).slice(0, -1).join("");
      } else {
        password += value;
      }
    };
    stdin.on("data", onData);
  });
};

const run = async () => {
  const command = process.argv[2];
  const databasePath = process.env.DATABASE_PATH ?? "./data/smart-gate.sqlite3";
  const db = createSqliteDatabase(databasePath);

  if (command === "create" || command === "create-admin") {
    const studentNumber = await ask("学籍番号: ");
    const name = await ask("氏名: ");
    const lcdDisplayName = await ask("LCD表示名: ");
    const email = await ask("メールアドレス: ");
    const password = await askPassword();
    const result = await createUser(
      db,
      { studentNumber, name, lcdDisplayName, email, password },
      { isAdmin: command === "create-admin" },
    );
    stdout.write(
      `利用者を作成しました。未照合イベント紐付け件数: ${result.linkedEventCount}\n`,
    );
    return;
  }

  const studentNumber = await ask("学籍番号: ");
  if (command === "reset-password") {
    await resetPassword(db, studentNumber, await askPassword());
  } else if (command === "enable" || command === "disable") {
    setUserActive(db, studentNumber, command === "enable");
  } else if (command === "unlock") {
    unlockUser(db, studentNumber);
  } else if (command === "promote-admin" || command === "demote-admin") {
    setUserAdmin(
      db,
      studentNumber,
      command === "promote-admin",
    );
  } else {
    throw new Error(
      "create, create-admin, reset-password, enable, disable, unlock, promote-admin, demote-adminを指定してください",
    );
  }
  stdout.write("更新しました。\n");
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "処理に失敗しました";
    console.error(message);
    process.exitCode = 1;
  });
}
