import { db } from "@/lib/db";

export class AuditService {
  static async log(data: {
    action: string;
    entity: string;
    entityId?: string;
    details?: string;
    userId: string;
  }) {
    return db.auditLog.create({
      data,
    });
  }

  static async getLogs(filters: {
    userId?: string;
    entity?: string;
    action?: string;
  } = {}) {
    return db.auditLog.findMany({
      where: filters,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
