import type { AdminRepository } from "../../repositories/admin-repository";
import { decodeAuditLogCursor, encodeAuditLogCursor } from "./audit-log-cursor";

export class ListAuditLogsUseCase {
  constructor(private readonly repository: AdminRepository) {}

  execute(input: { limit: number; cursor?: string }) {
    const result = this.repository.listAuditLogs({
      limit: input.limit,
      ...(input.cursor ? { cursor: decodeAuditLogCursor(input.cursor) } : {}),
    });
    const lastLog = result.logs.at(-1);

    return {
      logs: result.logs,
      nextCursor:
        result.hasMore && lastLog
          ? encodeAuditLogCursor({
              occurredAt: lastLog.occurredAt,
              id: lastLog.id,
            })
          : null,
    };
  }
}
