import { loadLocalEnvFile } from "../src/config/load-local-env";
import { attendanceEvents } from "../src/db/attendance-event-schema";
import { auditLogs } from "../src/db/audit-log-schema";
import { userCredentials } from "../src/db/auth-schema";
import { createSqliteDatabase } from "../src/db/client";
import { users } from "../src/db/user-schema";
import { hashPassword } from "../src/services/auth/password";

loadLocalEnvFile();

const databasePath = process.env.DATABASE_PATH ?? "./data/smart-gate.sqlite3";
const db = createSqliteDatabase(databasePath);
const password = "DemoPass2026!";
const passwordHash = await hashPassword(password);
const now = new Date();
const nowIso = now.toISOString();
const lockedUntil = new Date(
  now.getTime() + 7 * 24 * 60 * 60 * 1000,
).toISOString();
const month = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
}).format(now);

const demoUsers = [
  {
    id: "demo-member",
    studentNumber: "9900010010",
    name: "山田 太郎（デモ）",
    lcdDisplayName: "山田",
    email: "demo.member@example.test",
    userType: "student" as const,
    isAdmin: false,
    isActive: true,
  },
  {
    id: "demo-admin",
    studentNumber: "9900010020",
    name: "佐藤 花子（デモ管理者）",
    lcdDisplayName: "佐藤",
    email: "demo.admin@example.test",
    userType: "student" as const,
    isAdmin: true,
    isActive: true,
  },
  {
    id: "demo-inactive",
    studentNumber: "9900010030",
    name: "鈴木 次郎（無効デモ）",
    lcdDisplayName: "鈴木",
    email: "demo.inactive@example.test",
    userType: "student" as const,
    isAdmin: false,
    isActive: false,
  },
  {
    id: "demo-locked",
    studentNumber: "9900010040",
    name: "高橋 美咲（ロックデモ）",
    lcdDisplayName: "高橋",
    email: "demo.locked@example.test",
    userType: "student" as const,
    isAdmin: false,
    isActive: true,
  },
];

const at = (day: string, time: string) => `${month}-${day}T${time}+09:00`;

const demoEvents = [
  {
    eventId: `demo-${month}-member-01-in`,
    studentNumberSnapshot: "9900010010",
    userId: "demo-member",
    deviceId: "raspberry-pi-demo",
    method: "face" as const,
    eventType: "check_in" as const,
    authenticatedAt: at("01", "09:10:00"),
    receivedAt: at("01", "09:10:02"),
    confidence: 0.96,
  },
  {
    eventId: `demo-${month}-member-01-out`,
    studentNumberSnapshot: "9900010010",
    userId: "demo-member",
    deviceId: "raspberry-pi-demo",
    method: "card" as const,
    eventType: "check_out" as const,
    authenticatedAt: at("01", "17:35:00"),
    receivedAt: at("01", "17:35:02"),
    confidence: null,
  },
  {
    eventId: `demo-${month}-member-03-in`,
    studentNumberSnapshot: "9900010010",
    userId: "demo-member",
    deviceId: "raspberry-pi-demo",
    method: "card" as const,
    eventType: "check_in" as const,
    authenticatedAt: at("03", "10:00:00"),
    receivedAt: at("03", "10:00:01"),
    confidence: null,
  },
  {
    eventId: `demo-${month}-member-03-out`,
    studentNumberSnapshot: "9900010010",
    userId: "demo-member",
    deviceId: "raspberry-pi-demo",
    method: "card" as const,
    eventType: "check_out" as const,
    authenticatedAt: at("03", "18:15:00"),
    receivedAt: at("03", "18:15:02"),
    confidence: null,
  },
  {
    eventId: `demo-${month}-member-05-out-only`,
    studentNumberSnapshot: "9900010010",
    userId: "demo-member",
    deviceId: "raspberry-pi-demo",
    method: "card" as const,
    eventType: "check_out" as const,
    authenticatedAt: at("05", "18:00:00"),
    receivedAt: at("05", "18:00:02"),
    confidence: null,
  },
  {
    eventId: `demo-${month}-member-07-in-only`,
    studentNumberSnapshot: "9900010010",
    userId: "demo-member",
    deviceId: "raspberry-pi-demo",
    method: "face" as const,
    eventType: "check_in" as const,
    authenticatedAt: at("07", "09:30:00"),
    receivedAt: at("07", "09:30:03"),
    confidence: 0.91,
  },
  {
    eventId: `demo-${month}-member-08-in`,
    studentNumberSnapshot: "9900010010",
    userId: "demo-member",
    deviceId: "raspberry-pi-demo",
    method: "face" as const,
    eventType: "check_in" as const,
    authenticatedAt: at("08", "08:45:00"),
    receivedAt: at("08", "08:45:02"),
    confidence: 0.94,
  },
  {
    eventId: `demo-${month}-member-09-out`,
    studentNumberSnapshot: "9900010010",
    userId: "demo-member",
    deviceId: "raspberry-pi-demo",
    method: "card" as const,
    eventType: "check_out" as const,
    authenticatedAt: at("09", "00:20:00"),
    receivedAt: at("09", "00:20:02"),
    confidence: null,
  },
  {
    eventId: `demo-${month}-admin-02-in`,
    studentNumberSnapshot: "9900010020",
    userId: "demo-admin",
    deviceId: "raspberry-pi-demo",
    method: "face" as const,
    eventType: "check_in" as const,
    authenticatedAt: at("02", "08:55:00"),
    receivedAt: at("02", "08:55:02"),
    confidence: 0.98,
  },
  {
    eventId: `demo-${month}-admin-02-out`,
    studentNumberSnapshot: "9900010020",
    userId: "demo-admin",
    deviceId: "raspberry-pi-demo",
    method: "card" as const,
    eventType: "check_out" as const,
    authenticatedAt: at("02", "19:05:00"),
    receivedAt: at("02", "19:05:01"),
    confidence: null,
  },
  {
    eventId: `demo-${month}-admin-06-in`,
    studentNumberSnapshot: "9900010020",
    userId: "demo-admin",
    deviceId: "raspberry-pi-demo",
    method: "card" as const,
    eventType: "check_in" as const,
    authenticatedAt: at("06", "11:20:00"),
    receivedAt: at("06", "11:20:01"),
    confidence: null,
  },
  {
    eventId: `demo-${month}-admin-06-out`,
    studentNumberSnapshot: "9900010020",
    userId: "demo-admin",
    deviceId: "raspberry-pi-demo",
    method: "face" as const,
    eventType: "check_out" as const,
    authenticatedAt: at("06", "16:40:00"),
    receivedAt: at("06", "16:40:02"),
    confidence: 0.95,
  },
];

db.transaction((tx) => {
  for (const user of demoUsers) {
    tx.insert(users)
      .values({
        ...user,
        emailNormalized: user.email.toLowerCase(),
        faceImageCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          studentNumber: user.studentNumber,
          name: user.name,
          lcdDisplayName: user.lcdDisplayName,
          email: user.email,
          emailNormalized: user.email.toLowerCase(),
          userType: user.userType,
          isAdmin: user.isAdmin,
          isActive: user.isActive,
          faceImageCount: 0,
          updatedAt: nowIso,
        },
      })
      .run();

    tx.insert(userCredentials)
      .values({
        userId: user.id,
        passwordHash,
        failedLoginCount: user.id === "demo-locked" ? 5 : 0,
        lockedUntil: user.id === "demo-locked" ? lockedUntil : null,
        passwordChangedAt: nowIso,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: userCredentials.userId,
        set: {
          passwordHash,
          failedLoginCount: user.id === "demo-locked" ? 5 : 0,
          lockedUntil: user.id === "demo-locked" ? lockedUntil : null,
          passwordChangedAt: nowIso,
          updatedAt: nowIso,
        },
      })
      .run();
  }

  for (const event of demoEvents) {
    tx.insert(attendanceEvents).values(event).onConflictDoNothing().run();
  }

  const auditEntries = [
    {
      id: `demo-${month}-audit-created`,
      actorUserId: "demo-admin",
      action: "user_created" as const,
      resourceType: "user" as const,
      resourceId: "demo-member",
      occurredAt: at("01", "08:30:00"),
      changedFields: JSON.stringify([
        "studentNumber",
        "name",
        "lcdDisplayName",
        "email",
      ]),
    },
    {
      id: `demo-${month}-audit-updated`,
      actorUserId: "demo-admin",
      action: "user_updated" as const,
      resourceType: "user" as const,
      resourceId: "demo-member",
      occurredAt: at("04", "14:20:00"),
      changedFields: JSON.stringify(["lcdDisplayName"]),
    },
    {
      id: `demo-${month}-audit-disabled`,
      actorUserId: "demo-admin",
      action: "user_disabled" as const,
      resourceType: "user" as const,
      resourceId: "demo-inactive",
      occurredAt: at("06", "16:00:00"),
      changedFields: JSON.stringify(["isActive"]),
    },
  ];

  for (const entry of auditEntries) {
    tx.insert(auditLogs).values(entry).onConflictDoNothing().run();
  }
});

console.log(`Demo data seeded into ${databasePath}`);
console.log(`Month: ${month}`);
console.log("Member: demo.member@example.test / DemoPass2026!");
console.log("Admin:  demo.admin@example.test / DemoPass2026!");
